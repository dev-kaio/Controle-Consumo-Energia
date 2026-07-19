const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken, requireRole } = require("./requires");

// Busca o registro de um usuário e valida se quem chamou pode mexer nele:
// - superadmin pode mexer em qualquer um (menos em outro superadmin)
// - admin só pode mexer em inquilinos do próprio condomínio
// Devolve { userData } ou { erro: { status, mensagem } }.
async function validarAcessoAoUsuario(reqUser, uidAlvo) {
  const snap = await db.ref(`usuarios/${uidAlvo}`).once("value");
  if (!snap.exists()) {
    return { erro: { status: 404, mensagem: "Usuário não encontrado" } };
  }

  const userData = snap.val();

  if (userData.tipo === "superadmin") {
    return {
      erro: { status: 403, mensagem: "Superadmin não pode ser alterado por aqui" },
    };
  }

  if (reqUser.role !== "superadmin") {
    if (userData.condominioID !== reqUser.condominioID) {
      return { erro: { status: 403, mensagem: "Acesso negado" } };
    }
    if (userData.tipo !== "inquilino") {
      return {
        erro: {
          status: 403,
          mensagem: "Admin só pode alterar inquilinos",
        },
      };
    }
  }

  return { userData };
}

// Listar inquilinos (admin vê só os do próprio condomínio; superadmin vê todos).
// Existe para o frontend não precisar ler o nó "usuarios" direto pelo client
// SDK do Firebase — todo acesso a dados passa pelo backend.
router.get(
  "/listar",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const snapshot = await db.ref("usuarios").once("value");
      const todos = snapshot.val() || {};

      const inquilinos = {};
      for (const [uid, u] of Object.entries(todos)) {
        if (u.tipo !== "inquilino") continue;
        if (
          req.user.role !== "superadmin" &&
          u.condominioID !== req.user.condominioID
        )
          continue;
        // Devolve só o que a tela precisa — nada de vazar campos extras
        inquilinos[uid] = {
          nome: u.nome,
          email: u.email,
          aptoID: u.aptoID || null,
          ativo: u.ativo !== false,
          condominioID: u.condominioID,
        };
      }

      res.json({ inquilinos });
    } catch (error) {
      res.status(500).json({ erro: error.message });
    }
  },
);

// Criar usuario (admin e superadmin)
router.post(
  "/criar",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    const { nome, email, senha, condominioID, tipo, aptoID } = req.body;

    try {
      // Superadmin pode escolher condominioID, admin pega do claim
      let condoID;
      if (req.user.role === "superadmin") {
        condoID = condominioID; // do body
        if (!condoID) {
          return res
            .status(400)
            .json({ erro: "Condomínio ID é obrigatório para superadmin" });
        }
      } else {
        condoID = req.user.condominioID; // do claim
        if (!condoID) {
          return res
            .status(400)
            .json({ erro: "Admin sem condomínio configurado" });
        }
      }

      // Só existem dois tipos criáveis por esta rota. Superadmin nunca é
      // criado via API — se aceitássemos qualquer string aqui, um admin
      // poderia criar um usuário superadmin e escalar privilégio.
      const tipoFinal = tipo || "inquilino";
      if (!["inquilino", "admin"].includes(tipoFinal)) {
        return res.status(400).json({ erro: "Tipo de usuário inválido" });
      }

      // Admin só pode criar inquilino
      if (req.user.role !== "superadmin" && tipoFinal !== "inquilino") {
        return res.status(403).json({ erro: "Sem permissão para criar admin" });
      }

      // Inquilino precisa de um apartamento JÁ CADASTRADO (via /estrutura/
      // apartamentos) e que pertença ao condomínio da operação. Não se cria
      // mais apartamento "de carona" aqui — a estrutura física é explícita.
      if (tipoFinal === "inquilino") {
        if (!aptoID) {
          return res.status(400).json({ erro: "Apartamento é obrigatório" });
        }

        const aptoSnap = await db.ref(`apartamentos/${aptoID}`).once("value");
        const apto = aptoSnap.val();

        if (!apto) {
          return res.status(404).json({
            erro: "Apartamento não cadastrado — cadastre a estrutura primeiro",
          });
        }
        if (apto.condominioID !== condoID) {
          return res
            .status(403)
            .json({ erro: "Apartamento não pertence a esse condomínio" });
        }
      }

      // cria auth user PRIMEIRO (para ter o uid)
      const userRecord = await admin.auth().createUser({
        email,
        password: senha,
      });

      const uid = userRecord.uid;

      // salva usuario
      const userData = {
        nome,
        email,
        tipo: tipoFinal,
        ativo: true,
        condominioID: condoID,
      };

      if (tipoFinal === "inquilino") {
        userData.aptoID = aptoID;
      }

      await db.ref(`usuarios/${uid}`).set(userData);

      res.json({
        sucesso: true,
        uid,
      });
    } catch (error) {
      res.status(500).json({ erro: error.message });
    }
  },
);

// Atualizar dados
router.post(
  "/atualizar",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    const { uid, dados } = req.body;

    try {
      if (!uid || !dados || typeof dados !== "object") {
        return res.status(400).json({ erro: "uid e dados são obrigatórios" });
      }

      const acesso = await validarAcessoAoUsuario(req.user, uid);
      if (acesso.erro) {
        return res.status(acesso.erro.status).json({ erro: acesso.erro.mensagem });
      }

      // Whitelist de campos editáveis. Campos sensíveis (tipo, condominioID)
      // ficam de fora de propósito: aceitar o body inteiro permitiria a um
      // admin se promover a superadmin ou mover usuários de condomínio.
      // "email" também fica de fora: é a identidade de login (mora no Firebase
      // Auth) — editá-lo só aqui desincronizaria do credential real.
      const CAMPOS_PERMITIDOS = ["nome", "aptoID", "ativo"];
      const atualizacao = {};
      for (const campo of CAMPOS_PERMITIDOS) {
        if (campo in dados) atualizacao[campo] = dados[campo];
      }

      if (Object.keys(atualizacao).length === 0) {
        return res
          .status(400)
          .json({ erro: "Nenhum campo editável informado" });
      }

      // Trocar de apartamento: o novo apto precisa existir e ser do MESMO
      // condomínio do usuário (senão seria um jeito de vazar pra outro tenant)
      if (atualizacao.aptoID) {
        const aptoSnap = await db
          .ref(`apartamentos/${atualizacao.aptoID}`)
          .once("value");
        const apto = aptoSnap.val();

        if (!apto) {
          return res.status(404).json({ erro: "Apartamento não cadastrado" });
        }
        if (apto.condominioID !== acesso.userData.condominioID) {
          return res
            .status(403)
            .json({ erro: "Apartamento não pertence ao condomínio do usuário" });
        }
      }

      // Desativar precisa BARRAR o acesso de verdade, não só marcar no banco.
      // Espelhamos "ativo" no Firebase Auth (disabled): usuário desativado não
      // consegue mais logar (auth/user-disabled) e, com o revoke, a sessão
      // ativa cai quando o token expira (<=1h).
      //
      // Feito ANTES de gravar no DB: se o Auth falhar, o banco não é tocado e o
      // estado fica consistente (em vez de "ativo:false" no DB com login ainda
      // liberado no Auth).
      if ("ativo" in atualizacao) {
        const desativado = atualizacao.ativo === false;
        await admin.auth().updateUser(uid, { disabled: desativado });
        if (desativado) {
          await admin.auth().revokeRefreshTokens(uid);
        }
      }

      await db.ref(`usuarios/${uid}`).update(atualizacao);

      res.json({
        sucesso: true,
      });
    } catch (error) {
      res.status(500).json({ erro: error.message });
    }
  },
);

// Alterar senha (admin e superadmin). Define a nova senha DIRETO no Firebase
// Auth — não é e-mail de redefinição (esse fluxo self-service fica no login).
// Escopo idêntico ao de atualizar: superadmin em qualquer não-superadmin;
// admin só em inquilino do próprio condomínio.
//
// Deletar usuário deixou de existir de propósito: ninguém deleta, só desativa
// (ver /atualizar com { ativo: false }).
router.post(
  "/senha",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    const { uid, novaSenha } = req.body;

    try {
      if (!uid || !novaSenha) {
        return res
          .status(400)
          .json({ erro: "uid e novaSenha são obrigatórios" });
      }
      // Firebase exige no mínimo 6 caracteres — validar aqui pra devolver
      // uma mensagem clara em vez do erro cru do Admin SDK.
      if (String(novaSenha).length < 6) {
        return res
          .status(400)
          .json({ erro: "A senha deve ter pelo menos 6 caracteres" });
      }

      const acesso = await validarAcessoAoUsuario(req.user, uid);
      if (acesso.erro) {
        return res.status(acesso.erro.status).json({ erro: acesso.erro.mensagem });
      }

      await admin.auth().updateUser(uid, { password: novaSenha });

      res.json({ sucesso: true });
    } catch (error) {
      res.status(500).json({ erro: error.message });
    }
  },
);

module.exports = router;
