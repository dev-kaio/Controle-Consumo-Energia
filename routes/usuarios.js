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

      // Se for inquilino, precisa de apartamentoID
      if (tipoFinal === "inquilino" && !aptoID) {
        return res.status(400).json({ erro: "Apartamento é obrigatório" });
      }

      // cria auth user PRIMEIRO (para ter o uid)
      const userRecord = await admin.auth().createUser({
        email,
        password: senha,
      });

      const uid = userRecord.uid;

      // Se for inquilino, cria apartamento se não existir
      if (tipoFinal === "inquilino") {
        const aptoSnap = await db.ref(`apartamentos/${aptoID}`).once("value");

        // Se apartamento não existe, cria automaticamente com moradores
        if (!aptoSnap.exists()) {
          await db.ref(`apartamentos/${aptoID}`).set({
            condominioID: condoID,
            moradores: {
              [uid]: true,
            },
          });
        } else {
          // Se existe, só adiciona morador
          await db.ref(`apartamentos/${aptoID}/moradores/${uid}`).set(true);
        }
      }

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
      const CAMPOS_PERMITIDOS = ["nome", "email", "aptoID", "ativo"];
      const atualizacao = {};
      for (const campo of CAMPOS_PERMITIDOS) {
        if (campo in dados) atualizacao[campo] = dados[campo];
      }

      if (Object.keys(atualizacao).length === 0) {
        return res
          .status(400)
          .json({ erro: "Nenhum campo editável informado" });
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

// Deletar inquilino
router.post(
  "/deletar",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    const { uid } = req.body;

    try {
      if (!uid) {
        return res.status(400).json({ erro: "uid é obrigatório" });
      }

      const acesso = await validarAcessoAoUsuario(req.user, uid);
      if (acesso.erro) {
        return res.status(acesso.erro.status).json({ erro: acesso.erro.mensagem });
      }

      const aptoID = acesso.userData.aptoID;

      // remove auth
      await admin.auth().deleteUser(uid);

      // remove do apto
      if (aptoID) {
        await db.ref(`apartamentos/${aptoID}/moradores/${uid}`).remove();
      }

      // remove do banco
      await db.ref(`usuarios/${uid}`).remove();

      res.json({
        sucesso: true,
      });
    } catch (error) {
      res.status(500).json({ erro: error.message });
    }
  },
);

module.exports = router;
