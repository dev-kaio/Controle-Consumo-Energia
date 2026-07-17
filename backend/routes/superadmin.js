const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const {
  authenticateToken,
  requireRole,
} = require("./requires");

// Listar todos os usuários (somente superadmin)
router.get(
  "/usuarios",
  authenticateToken,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const snapshot = await db.ref("usuarios").once("value");
      const usuarios = snapshot.val() || {};
      
      // Remover dados sensíveis
      const usuariosFormatados = {};
      for (const uid in usuarios) {
        usuariosFormatados[uid] = {
          nome: usuarios[uid].nome,
          email: usuarios[uid].email,
          tipo: usuarios[uid].tipo,
          condominioID: usuarios[uid].condominioID,
          ativo: usuarios[uid].ativo,
          aptoID: usuarios[uid].aptoID,
        };
      }

      res.json({ usuarios: usuariosFormatados });
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      res.status(500).json({ erro: "Erro ao buscar usuários" });
    }
  }
);

// Listar todos os condomínios (somente superadmin)
router.get(
  "/condominios",
  authenticateToken,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const snapshot = await db.ref("condominios").once("value");
      const condominios = snapshot.val() || {};

      res.json({ condominios });
    } catch (err) {
      console.error("Erro ao buscar condomínios:", err);
      res.status(500).json({ erro: "Erro ao buscar condomínios" });
    }
  }
);

// Atualizar usuario (somente superadmin)
router.post(
  "/atualizar",
  authenticateToken,
  requireRole("superadmin"),
  async (req, res) => {
    const { uid, dados } = req.body;
    const { uid: adminUid, role } = req.user;

    // Verificações de segurança
    if (role !== "superadmin") {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    // Não permitir que superadmin altere own role
    if (dados.tipo === "superadmin") {
      return res.status(403).json({ erro: "Não pode alterar para superadmin" });
    }

    try {
      await db.ref(`usuarios/${uid}`).update(dados);
      res.json({ sucesso: true });
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      res.status(500).json({ erro: "Erro ao atualizar" });
    }
  }
);

module.exports = router;