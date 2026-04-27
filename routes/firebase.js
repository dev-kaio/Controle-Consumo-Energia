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

async function buscarDadosPorTipo(
  tipoFirebase, // consumo | autoconsumo | geracao
  tipoRetorno,
  filtro,
  inicio,
  fim,
  apartamentoId,
) {
  let dataInicio, dataFim;

  if (filtro) {
    const intervalo = calcularIntervalo(filtro);
    if (!intervalo) throw new Error("Filtro inválido");
    dataInicio = new Date(intervalo.inicio);
    dataFim = new Date(intervalo.fim);
  } else if (inicio && fim) {
    dataInicio = new Date(inicio);
    dataFim = new Date(fim);
  } else {
    throw new Error("Parâmetros inválidos");
  }

  const resultado = [];

  // CASO COM APARTAMENTO
  if (apartamentoId) {
    const snapshot = await db
      .ref(`leituras/apto_${apartamentoId}/${tipoFirebase}`)
      .once("value");

    const registros = snapshot.val();
    if (!registros) return [];

    for (const item of Object.values(registros)) {
      const data = new Date(item.timestamp);

      if (data >= dataInicio && data <= dataFim) {
        resultado.push({
          timestamp: item.timestamp,
          valorKWh: item.valorKWh,
          tipo: tipoRetorno,
          aptoID: apartamentoId,
        });
      }
    }

    return resultado;
  }

  // TODOS APARTAMENTOS
  const snapshotTodos = await db.ref(`leituras`).once("value");
  const todos = snapshotTodos.val();

  if (!todos) return [];

  for (const [aptoKey, aptoData] of Object.entries(todos)) {
    const numero = aptoKey.replace("apto_", "");

    const registros = aptoData[tipoFirebase];
    if (!registros) continue;

    for (const item of Object.values(registros)) {
      const data = new Date(item.timestamp);

      if (data >= dataInicio && data <= dataFim) {
        resultado.push({
          timestamp: item.timestamp,
          valorKWh: item.valorKWh,
          tipo: tipoRetorno,
          aptoID: `apto_${numero}`,
        });
      }
    }
  }

  return resultado;
}

const { authenticateToken } = require("./requires");

router.get("/consumo", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim, apartamentoId } = req.query;
    const { role, apartamentoId: aptToken } = req.user;

    let aptFinal = apartamentoId;

    if (role === "inquilino") {
      // Inquilino só vê o próprio ap
      aptFinal = aptToken;

      // Tentou forçar outro?
      if (apartamentoId && apartamentoId !== aptToken) {
        return res.status(403).json({ erro: "Acesso negado" });
      }
    }

    const dados = await buscarDadosPorTipo(
      "consumo",
      "consumo",
      filtro,
      inicio,
      fim,
      aptFinal,
    );

    res.json(dados);
  } catch (error) {
    console.error("Erro em /consumo:", error);
    res.status(400).json({ erro: error.message });
  }
});

router.get("/autoconsumo", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim, apartamentoId } = req.query;
    const { role, apartamentoId: aptToken } = req.user;

    let aptFinal = apartamentoId;

    if (role === "inquilino") {
      aptFinal = aptToken;

      if (apartamentoId && apartamentoId !== aptToken) {
        return res.status(403).json({ erro: "Acesso negado" });
      }
    }

    const dados = await buscarDadosPorTipo(
      "autoconsumo",
      "autoconsumo",
      filtro,
      inicio,
      fim,
      aptFinal,
    );

    res.json(dados);
  } catch (error) {
    console.error("Erro em /autoconsumo:", error);
    res.status(400).json({ erro: error.message });
  }
});

router.get("/geracao", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim, apartamentoId } = req.query;
    const { role, apartamentoId: aptToken } = req.user;

    let aptFinal = apartamentoId;

    if (role === "inquilino") {
      aptFinal = aptToken;

      if (apartamentoId && apartamentoId !== aptToken) {
        return res.status(403).json({ erro: "Acesso negado" });
      }
    }

    const dados = await buscarDadosPorTipo(
      "geracao",
      "geracao",
      filtro,
      inicio,
      fim,
      aptFinal,
    );

    res.json(dados);
  } catch (error) {
    console.error("Erro em /geracao:", error);
    res.status(400).json({ erro: error.message });
  }
});

module.exports = router;
