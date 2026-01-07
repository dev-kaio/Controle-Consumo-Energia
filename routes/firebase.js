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
  tipoFirebase,
  tipoRetorno,
  filtro,
  inicio,
  fim,
  apartamentoId
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

  if (apartamentoId) {
    const snapshot = await db
      .ref(
        `/${tipoFirebase}/Apartamentos/apartamento${apartamentoId}/${tipoFirebase}`
      )
      .once("value");
    const registros = snapshot.val();
    if (!registros) return [];

    const resultado = [];

    for (const bloco of Object.values(registros)) {
      // cada pushId (1 minuto)
      for (const item of Object.values(bloco)) {
        // cada leitura dentro do minuto
        const data = new Date(item.timestamp);

        if (data >= dataInicio && data <= dataFim) {
          resultado.push({
            ...item,
            tipo: tipoRetorno,
            apartamentoId,
          });
        }
      }
    }

    return resultado;
  }

  const snapshotTodos = await db
    .ref(`/${tipoFirebase}/Apartamentos`)
    .once("value");
  const todosApartamentos = snapshotTodos.val();

  if (!todosApartamentos) return [];

  const resultadoGeral = [];

  // Percorre cada apartamento
  for (const [apartKey, apartData] of Object.entries(todosApartamentos)) {
    const registros = apartData[tipoFirebase];
    if (!registros) continue;

    for (const bloco of Object.values(registros)) {
      for (const item of Object.values(bloco)) {
        const data = new Date(item.timestamp);

        if (data >= dataInicio && data <= dataFim) {
          resultadoGeral.push({
            ...item,
            tipo: tipoRetorno,
            apartamentoId: apartKey.replace("apartamento", ""),
          });
        }
      }
    }
  }

  return resultadoGeral;
}

const { authenticateToken } = require("./auth");

router.get("/consumo", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim, apartamentoId } = req.query;
    const dados = await buscarDadosPorTipo(
      "Consumos",
      "consumo",
      filtro,
      inicio,
      fim,
      apartamentoId
    );
    res.json(dados);
  } catch (error) {
    console.error("Erro em /consumo:", error);
    res.status(400).json({ erro: error.message });
  }
});

router.get("/autoconsumo", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim } = req.query;
    const dados = await buscarDadosPorTipo(
      "AutoConsumo",
      "autoconsumo",
      filtro,
      inicio,
      fim
    );
    res.json(dados);
  } catch (error) {
    console.error("Erro em /autoconsumo:", error);
    res.status(400).json({ erro: error.message });
  }
});

router.get("/geracao", authenticateToken, async (req, res) => {
  try {
    const { filtro, inicio, fim } = req.query;
    const dados = await buscarDadosPorTipo(
      "Geracao",
      "geracao",
      filtro,
      inicio,
      fim
    );
    res.json(dados);
  } catch (error) {
    console.error("Erro em /geracao:", error);
    res.status(400).json({ erro: error.message });
  }
});

module.exports = router;
