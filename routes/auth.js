const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const {
  authenticateToken
} = require("./requires");

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
    const { tipo, predioId } = req.body;
    const uid = req.user.uid;

    if (!["superadmin", "dono", "inquilino"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de usuário inválido" });
    }

    const claims = {
      role: tipo,
    };

    // só dono e inquilino têm prédio
    if (tipo !== "superadmin") {
      claims.predioId = predioId || null;
    }

    await admin.auth().setCustomUserClaims(uid, claims);

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao definir claims:", err);
    res.status(500).json({ error: "Erro ao definir role" });
  }
});

module.exports = router;
