const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();

function calcularIntervalo(filtro) {
  const agora = new Date();
  let inicio;

  switch (filtro) {
    case "hora":
      inicio = new Date(agora.getTime() - 60 * 60 * 1000);
      break;
    case "dia":
      inicio = new Date(agora.setHours(0, 0, 0, 0));
      break;
    case "semana":
      inicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "mes":
      inicio = new Date(agora.setDate(1));
      break;
    case "ano":
      inicio = new Date(agora.setMonth(0, 1));
      break;
    case "inicio":
      inicio = new Date(0);
      break;
    default:
      return null;
  }

  return {
    inicio: inicio.toISOString(),
    fim: new Date().toISOString(),
  };
}

router.get("/consumo", async (req, res) => {
  try {
    const { filtro, inicio, fim } = req.query;

    let dataInicio, dataFim;

    if (filtro) {
      const intervalo = calcularIntervalo(filtro);
      if (!intervalo) return res.status(400).json({ erro: "Filtro inválido" });

      dataInicio = new Date(intervalo.inicio);
      dataFim = new Date(intervalo.fim);
    } else if (inicio && fim) {
      dataInicio = new Date(inicio);
      dataFim = new Date(fim);
    } else {
      return res.status(400).json({ erro: "Parâmetros inválidos" });
    }

    const snapshot = await db.ref("Consumos").once("value");
    const registros = snapshot.val();

    if (!registros) return res.json([]);

    const resultado = Object.values(registros).filter((item) => {
      const data = new Date(item.timestamp);
      return data >= dataInicio && data <= dataFim;
    });

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

module.exports = router;
