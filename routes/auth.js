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

module.exports = { router, authenticateToken };
