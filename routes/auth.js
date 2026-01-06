const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Erro ao verificar token:", err);
    res.status(403).json({ erro: "Token inválido" });
  }
}

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

    if (!["dono", "inquilino"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de usuário inválido" });
    }

    await admin.auth().setCustomUserClaims(uid, { role: tipo });

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao definir role: ", err);
    res.status(500).json({ error: "Erro ao definir role" });
  }
});

function requireDono(req, res, next) {
  if (req.user.role !== "dono") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

module.exports = { router, authenticateToken, requireDono };
