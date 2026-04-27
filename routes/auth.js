const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const { authenticateToken } = require("./requires");

router.post("/login", authenticateToken, (req, res) => {
  return res.json({
    message: "Login validado com sucesso.",
    uid: req.user.uid,
  });
});

router.post("/registrar", authenticateToken, (req, res) => {
  return res.json({
    message: "Registro validado com sucesso.",
    uid: req.user.uid,
  });
});

router.post("/role", authenticateToken, async (req, res) => {
  try {
    const { tipo } = req.body;
    const uid = req.user.uid;

    if (!["superadmin", "admin", "inquilino"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de usuário inválido" });
    }

    const db = admin.database();

    // pega dados do usuário no banco
    const userSnap = await db.ref(`usuarios/${uid}`).once("value");
    const userData = userSnap.val();

    if (!userData) {
      return res.status(404).json({ error: "Usuário não encontrado no banco" });
    }

    let claims = {
      role: tipo,
    };

    if (tipo === "admin") {
      if (!userData.condominioID) {
        return res.status(400).json({ error: "Admin sem condominio" });
      }

      claims = {
        role: "admin",
        condominioID: userData.condominioID,
      };
    } else if (tipo === "superadmin") {
      // Superadmin não precisa de condominioID
      claims = {
        role: "superadmin",
      };
    }

    if (tipo === "inquilino") {
      const aptoID = userData.aptoID;

      if (!aptoID) {
        return res.status(400).json({ error: "Inquilino sem apartamento" });
      }

      const aptoSnap = await db.ref(`apartamentos/${aptoID}`).once("value");
      const aptoData = aptoSnap.val();

      if (!aptoData) {
        return res.status(404).json({ error: "Apartamento não encontrado" });
      }

      claims = {
        role: "inquilino",
        condominioID: userData.condominioID,
        predioID: aptoData.predioID,
        aptoID: aptoID,
      };
    }

    await admin.auth().setCustomUserClaims(uid, claims);

    res.json({ ok: true, claims });
  } catch (err) {
    console.error("Erro ao definir claims:", err);
    res.status(500).json({ error: "Erro ao definir role" });
  }
});

module.exports = router;
