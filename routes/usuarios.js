const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken, requireRole } = require("./requires");

// Criar usuario (admin e superadmin)
router.post(
  "/criar",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    const { nome, email, senha, condominioID, tipo, aptoID } = req.body;

    // LOG DEBUG BACKEND
    console.log("=== DEBUG BACKEND - req.body ===");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("req.user:", req.user);

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

      // Se não for superadmin, só pode criar inquilino
      if (req.user.role !== "superadmin" && tipo === "admin") {
        return res.status(403).json({ erro: "Sem permissão para criar admin" });
      }

      // Se for inquilino, precisa de apartamentoID
      if (tipo === "inquilino" || !tipo) {
        if (!aptoID) {
          return res.status(400).json({ erro: "Apartamento é obrigatório" });
        }
      }

      // cria auth user PRIMEIRO (para ter o uid)
      const userRecord = await admin.auth().createUser({
        email,
        password: senha,
      });

      const uid = userRecord.uid;

      // Se for inquilino, cria apartamento se não existir
      if (tipo === "inquilino" || !tipo) {
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
        tipo: tipo || "inquilino",
        ativo: true,
        condominioID: condoID,
      };

      if (tipo === "inquilino" || !tipo) {
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
      await db.ref(`usuarios/${uid}`).update(dados);

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
      const userSnap = await db.ref(`usuarios/${uid}`).once("value");

      if (!userSnap.exists()) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      const userData = userSnap.val();

      const aptoID = userData.aptoID;

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
