const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();

const { authenticateToken } = require("./requires");
const { validarAptoId } = require("../utils/idUtils");
const { mesesNoIntervalo, mesDaData, mesAnterior } = require("../utils/mesUtils");
const { resolverAptosAlvo } = require("../utils/escopoUtils");

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

// Lê as leituras de UM apartamento no intervalo, aproveitando a partição
// mensal (leituras/{apto}/{tipo}/{AAAA-MM}/...): só os meses do intervalo
// são baixados. Intervalos gigantes ("Desde o Início") leem o nó do tipo
// inteiro de uma vez — dá no mesmo, todos os meses seriam necessários.
const LIMITE_MESES_POR_CONSULTA = 36;

async function lerLeiturasDoApto(aptoId, tipoDado, dataInicio, dataFim) {
  const meses = mesesNoIntervalo(dataInicio, dataFim);

  let porMes; // { "2026-07": { pushId: leitura, ... }, ... }

  if (meses.length > LIMITE_MESES_POR_CONSULTA) {
    const snapshot = await db.ref(`leituras/${aptoId}/${tipoDado}`).once("value");
    porMes = snapshot.val() || {};
  } else {
    porMes = {};
    const snapshots = await Promise.all(
      meses.map((mes) =>
        db.ref(`leituras/${aptoId}/${tipoDado}/${mes}`).once("value"),
      ),
    );
    snapshots.forEach((snap, i) => {
      if (snap.val()) porMes[meses[i]] = snap.val();
    });
  }

  const resultado = [];
  for (const registrosDoMes of Object.values(porMes)) {
    for (const item of Object.values(registrosDoMes)) {
      const data = new Date(item.timestamp);
      if (data >= dataInicio && data <= dataFim) {
        resultado.push({
          timestamp: item.timestamp,
          valorKWh: item.valorKWh,
          tipo: tipoDado,
          aptoID: aptoId,
        });
      }
    }
  }
  return resultado;
}

// Cria o handler de /consumo, /autoconsumo e /geracao — a lógica é idêntica,
// só muda o tipo de dado lido em leituras/{apto}/{tipoDado}.
function criarHandlerDeLeitura(tipoDado) {
  return async (req, res) => {
    try {
      const { filtro, inicio, fim } = req.query;
      // O frontend historicamente manda ora "apartamentoId", ora "aptoID" —
      // aceitamos os dois para não quebrar chamadas existentes.
      const aptoQuery = req.query.apartamentoId || req.query.aptoID || null;

      if (aptoQuery && !validarAptoId(aptoQuery)) {
        return res.status(400).json({ erro: "aptoID inválido" });
      }

      let dataInicio, dataFim;
      if (filtro) {
        const intervalo = calcularIntervalo(filtro);
        if (!intervalo) {
          return res.status(400).json({ erro: "Filtro inválido" });
        }
        dataInicio = new Date(intervalo.inicio);
        dataFim = new Date(intervalo.fim);
      } else if (inicio && fim) {
        dataInicio = new Date(inicio);
        dataFim = new Date(fim);
      } else {
        return res.status(400).json({ erro: "Parâmetros inválidos" });
      }

      // ---- Controle de acesso por papel (utils/escopoUtils.js) ----
      const alvo = await resolverAptosAlvo(db, req.user, aptoQuery);
      if (alvo.erro) {
        return res.status(alvo.status).json({ erro: alvo.erro });
      }

      const porApto = await Promise.all(
        alvo.aptos.map((aptoId) =>
          lerLeiturasDoApto(aptoId, tipoDado, dataInicio, dataFim),
        ),
      );

      res.json(porApto.flat());
    } catch (error) {
      console.error(`Erro em /${tipoDado}:`, error);
      res.status(500).json({ erro: "Erro ao buscar dados" });
    }
  };
}

router.get("/consumo", authenticateToken, criarHandlerDeLeitura("consumo"));
router.get(
  "/autoconsumo",
  authenticateToken,
  criarHandlerDeLeitura("autoconsumo"),
);
router.get("/geracao", authenticateToken, criarHandlerDeLeitura("geracao"));

/* ==========================
   ÚLTIMA LEITURA (potência instantânea do dashboard)
========================== */

// INVARIANTE DE QUE ESTA ROTA DEPENDE: as chaves de leitura são push ids do
// Firebase, que são cronológicos por construção. Quem grava usa push()
// (routes/espsync.js) e o seed também — se algum dia alguém inventar um
// esquema de chave próprio, cuidado: orderByKey é LEXICOGRÁFICO, e numa
// numeração ingênua "l99" vem depois de "l335". Já aconteceu com o seed:
// o dashboard mostrava uma leitura de 5 dias atrás como potência "atual".
//
// Quantos registros do fim do mês baixar pra achar o mais recente. O último
// inserido quase sempre é o mais novo — "quase" porque um lote atrasado da
// ESP (wifi voltou) entra fora de ordem. Pegar 5 e escolher pelo timestamp
// cobre isso e continua custando uma fração do que seria baixar o mês
// inteiro (dezenas de milhares de registros).
const LEITURAS_DE_SOBRA = 5;

async function ultimaLeituraDoMes(aptoId, mes) {
  const snap = await db
    .ref(`leituras/${aptoId}/consumo/${mes}`)
    .orderByKey()
    .limitToLast(LEITURAS_DE_SOBRA)
    .once("value");

  const registros = snap.val();
  if (!registros) return null;

  const ordenadas = Object.values(registros)
    .filter((r) => r && r.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return ordenadas[0] || null;
}

// Leitura mais recente de UM apartamento — alimenta o card de potência.
// A potência já é gravada por routes/espsync.js desde sempre; o handler de
// série histórica (lerLeiturasDoApto) é que não a devolve, porque só monta
// {timestamp, valorKWh}. Por isso a rota separada em vez de um filtro.
router.get("/ultima-leitura", authenticateToken, async (req, res) => {
  try {
    const aptoQuery = req.query.apartamentoId || req.query.aptoID || null;

    if (aptoQuery && !validarAptoId(aptoQuery)) {
      return res.status(400).json({ erro: "aptoID inválido" });
    }

    const alvo = await resolverAptosAlvo(db, req.user, aptoQuery);
    if (alvo.erro) {
      return res.status(alvo.status).json({ erro: alvo.erro });
    }

    // Um apartamento por vez, de propósito: somar a potência de mil aptos
    // custaria mil leituras a cada abertura do dashboard. Total do condomínio
    // é assunto do fechamento, que roda sob demanda.
    if (alvo.aptos.length !== 1) {
      return res.status(400).json({ erro: "Apartamento é obrigatório" });
    }

    const aptoID = alvo.aptos[0];

    // Virada de mês: no dia 1 o nó novo ainda está vazio por alguns minutos,
    // então cai pro mês anterior em vez de dizer "sem leitura".
    const mes = mesDaData(new Date());
    const leitura =
      (await ultimaLeituraDoMes(aptoID, mes)) ||
      (await ultimaLeituraDoMes(aptoID, mesAnterior(mes)));

    if (!leitura) {
      return res.json({ aptoID, timestamp: null });
    }

    // O frontend decide se o dado está velho demais pelo timestamp — o
    // backend não esconde leitura antiga, só entrega o que tem.
    res.json({
      aptoID,
      timestamp: leitura.timestamp,
      potencia: leitura.potencia ?? null,
      corrente: leitura.corrente ?? null,
      valorKWh: leitura.valorKWh ?? null,
    });
  } catch (error) {
    console.error("Erro em /ultima-leitura:", error);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

module.exports = router;
