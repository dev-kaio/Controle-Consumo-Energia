const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken, requireDono } = require("./auth");

// Cria um novo inquilino
router.post("/criar", authenticateToken, requireDono, async (req, res) => {
    const { nome, email, senha, apartamento } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password: senha,
        });

        // Salva no banco
        await db.ref(`Usuarios/${userRecord.uid}`).set({
            nome,
            email,
            tipo: "inquilino",
            apartamento,
            ativo: true,
        });

        res.json({ sucesso: true, uid: userRecord.uid });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Atualiza (ex: ativar/desativar)
router.post("/atualizar", authenticateToken, requireDono, async (req, res) => {
    const { uid, dados } = req.body;

    try {
        await db.ref(`Usuarios/${uid}`).update(dados);
        res.json({ sucesso: true });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Deleta inquilino
router.post("/deletar", authenticateToken, requireDono, async (req, res) => {
    const { uid } = req.body;

    try {
        await admin.auth().deleteUser(uid);
        await db.ref(`Usuarios/${uid}`).remove();
        res.json({ sucesso: true });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
