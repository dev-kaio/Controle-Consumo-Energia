const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();
const { mesDaData } = require("../utils/mesUtils");

// Recebe lotes de leituras da ESP32.
//
// Autenticação por DISPOSITIVO: a ESP manda o próprio id (x-esp-id) e a
// chave gerada no cadastro (x-api-key). O backend resolve o apartamento
// pelo cadastro em dispositivos/{espId} — o firmware não sabe (nem
// precisa saber) de apartamento, e revogar uma ESP não afeta as outras.
router.post("/esp/dados", async (req, res) => {
  try {
    const espId = req.headers["x-esp-id"];
    const chave = req.headers["x-api-key"];
    const { leituras } = req.body;

    if (!espId || !chave) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    const dispSnap = await db.ref(`dispositivos/${espId}`).once("value");
    const dispositivo = dispSnap.val();

    if (!dispositivo || dispositivo.chave !== chave || !dispositivo.ativo) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    if (!Array.isArray(leituras) || leituras.length === 0) {
      return res.status(400).json({ erro: "Dados inválidos" });
    }

    const aptoID = dispositivo.aptoID;
    let gravadas = 0;

    for (const item of leituras) {
      // Partição mensal: cada leitura vai pro nó do mês do próprio timestamp
      const mes = mesDaData(item.timestamp);
      if (!mes || typeof item.valor !== "number") continue; // descarta lixo

      await db.ref(`leituras/${aptoID}/consumo/${mes}`).push({
        timestamp: item.timestamp,
        valorKWh: item.valor,
        potencia: item.potencia ?? null,
        corrente: item.corrente ?? null,
      });
      gravadas++;
    }

    res.json({ ok: true, gravadas });
    console.log(`ESP ${espId} → ${aptoID}: ${gravadas} leituras gravadas`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar" });
  }
});

module.exports = router;
