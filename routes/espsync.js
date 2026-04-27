const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();

router.post("/esp/dados", async (req, res) => {
  try {
    const { aptoID, leituras } = req.body;

    if (req.headers["x-api-key"] !== process.env.ESP_KEY) {
      return res.status(403).send("Acesso negado");
    }

    if (!aptoID || !Array.isArray(leituras)) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const ref = db.ref(`leituras/${aptoID}/consumo`);

    for (const item of leituras) {
      const novo = ref.push();

      await novo.set({
        timestamp: item.timestamp,
        valorKWh: item.valor,
        potencia: item.potencia || null,
        corrente: item.corrente || null,
      });
    }

    res.json({ ok: true });
    console.log(
      `Dados recebidos do ESP para ${aptoID}: ${leituras.length} leituras`,
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar" });
  }
});

module.exports = router;
