const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();

router.get("/consumo", async (req, res) => {
  try {
    const { periodo, inicio, fim } = req.query;

    const ref = db.ref("Consumo");
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      return res.json({ labels: [], valores: [] });
    }

    const dados = snapshot.val();

    let inicioPeriodo = 0;
    let fimPeriodo = Date.now();

    const agora = new Date();

    switch (periodo) {
      case "hora":
        inicioPeriodo = agora.getTime() - 60 * 60 * 1000;
        break;
      case "dia":
        inicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
        break;
      case "semana":
        inicioPeriodo = agora.getTime() - 7 * 24 * 60 * 60 * 1000;
        break;
      case "mes":
        inicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
        break;
      case "ano":
        inicioPeriodo = new Date(agora.getFullYear(), 0, 1).getTime();
        break;
      case "inicio":
        inicioPeriodo = 0;
        break;
      default:
        if (inicio && fim) {
          inicioPeriodo = new Date(inicio).getTime();
          fimPeriodo = new Date(fim).getTime();
        }
    }

    let labels = [];
    let valores = [];

    Object.keys(dados).forEach((horario) => {
      const item = dados[horario];
      const ts = item.timestamp;

      if (ts >= inicioPeriodo && ts <= fimPeriodo) {
        labels.push(horario);
        valores.push(item.Whora);
      }
    });

    return res.json({ labels, valores });
  } catch (error) {
    console.error("Erro ao buscar consumo:", error);
    return res.status(500).json({ error: "Erro ao buscar consumo" });
  }
});

module.exports = router;
