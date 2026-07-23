const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken } = require("./requires");
const { calcularFatura } = require("../utils/faturaUtils");
const { validarAptoId } = require("../utils/idUtils");

const REGEX_COMPETENCIA = /^\d{4}-\d{2}$/;

// Calcula o valor da conta (TUSD, TE, IP-CIP, total) de um apartamento
// numa competência (mês). O cálculo mora em utils/faturaUtils.js — aqui só
// entra quem pode ver o quê.
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { apartamentoId, competencia } = req.query;
    const { role, apartamentoId: aptToken } = req.user;

    if (!apartamentoId || !competencia) {
      return res
        .status(400)
        .json({ erro: "apartamentoId e competencia são obrigatórios" });
    }

    if (!validarAptoId(apartamentoId)) {
      return res.status(400).json({ erro: "apartamentoId inválido" });
    }

    if (!REGEX_COMPETENCIA.test(competencia)) {
      return res
        .status(400)
        .json({ erro: "competencia deve estar no formato AAAA-MM (ex: 2026-01)" });
    }

    // Inquilino só pode calcular a conta do próprio apartamento
    if (role === "inquilino" && apartamentoId !== aptToken) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    const aptoSnap = await db.ref(`apartamentos/${apartamentoId}`).once("value");
    const aptoData = aptoSnap.val();

    if (!aptoData) {
      return res.status(404).json({ erro: "Apartamento não encontrado" });
    }

    // Admin só pode consultar apartamentos do próprio condomínio
    if (role === "admin" && aptoData.condominioID !== req.user.condominioID) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    // O apartamento já foi lido acima pra checar o escopo — passa adiante
    // em vez de deixar o util reler o mesmo nó.
    const fatura = await calcularFatura(db, apartamentoId, competencia, {
      apartamento: aptoData,
    });

    if (fatura.erro) {
      return res.status(fatura.status).json({ erro: fatura.erro });
    }

    res.json(fatura);
  } catch (err) {
    console.error("Erro em /financeiro:", err);
    res.status(500).json({ erro: "Erro ao calcular financeiro" });
  }
});

module.exports = router;
