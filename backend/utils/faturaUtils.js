/**
 * Cálculo da conta de UM apartamento numa competência.
 *
 * Saiu de dentro de routes/financeiro.js quando a fatura imprimível e o
 * fechamento de competência passaram a precisar do mesmo número — três
 * cópias da regra de faturamento é como se descobre, meses depois, que a
 * fatura entregue ao morador não bate com o relatório do síndico.
 *
 * O `contexto` existe pro fechamento: numa competência de 1000 apartamentos,
 * a tarifa e o condomínio são os MESMOS pra todos. Buscar uma vez lá fora e
 * passar aqui economiza ~2000 leituras do Firebase por fechamento.
 *
 * NÃO faz controle de acesso — quem chama decide quem pode ver o quê
 * (routes/financeiro.js usa req.user; ver utils/escopoUtils.js).
 */
const { calcularKwhFaturado } = require("./consumoUtils");
const { buscarTarifaVigente } = require("./tarifaUtils");
const { mesAnterior } = require("./mesUtils");

// Registros do Firebase -> lista ordenada por tempo, descartando lixo
// (leitura sem timestamp ou com valorKWh que não é número).
function ordenarLeituras(registros) {
  return registros
    ? Object.values(registros)
        .filter((r) => typeof r.valorKWh === "number" && r.timestamp)
        .map((r) => ({ timestamp: new Date(r.timestamp), valorKWh: r.valorKWh }))
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];
}

async function lerOuUsar(db, caminho, valorPronto) {
  if (valorPronto !== undefined) return valorPronto;
  const snap = await db.ref(caminho).once("value");
  return snap.val();
}

/**
 * @param {object} db - Firebase Admin database
 * @param {string} aptoID - id composto, ex "sol-blocoA-101"
 * @param {string} competencia - "AAAA-MM"
 * @param {object} [contexto] - { apartamento, condominio, tarifa } já lidos
 * @returns {Promise<object>} a fatura, ou { erro, status } se faltar cadastro
 */
async function calcularFatura(db, aptoID, competencia, contexto = {}) {
  const apartamento = await lerOuUsar(
    db,
    `apartamentos/${aptoID}`,
    contexto.apartamento,
  );
  if (!apartamento) {
    return { erro: "Apartamento não encontrado", status: 404 };
  }

  const tarifa =
    contexto.tarifa !== undefined
      ? contexto.tarifa
      : await buscarTarifaVigente(db, apartamento.condominioID, competencia);
  if (!tarifa) {
    return {
      erro: "Nenhuma tarifa cadastrada para o condomínio deste apartamento",
      status: 404,
    };
  }

  const condominio = await lerOuUsar(
    db,
    `condominios/${apartamento.condominioID}`,
    contexto.condominio,
  );

  // Graças à partição mensal, a conta de um mês lê só dois nós: o mês da
  // competência e o anterior (a última leitura dele é o "baseline" — o ponto
  // de partida do acumulado, já que valorKWh é cumulativo).
  const base = `leituras/${aptoID}/consumo`;
  const [mesSnap, anteriorSnap] = await Promise.all([
    db.ref(`${base}/${competencia}`).once("value"),
    db.ref(`${base}/${mesAnterior(competencia)}`).once("value"),
  ]);

  const dentroPeriodo = ordenarLeituras(mesSnap.val());
  const anteriores = ordenarLeituras(anteriorSnap.val());
  const baseline =
    anteriores.length > 0 ? [anteriores[anteriores.length - 1]] : [];

  const serie = [...baseline, ...dentroPeriodo];
  const kwhFaturado = calcularKwhFaturado(serie);

  const valorTUSD = kwhFaturado * tarifa.tusd;
  const valorTE = kwhFaturado * tarifa.te;
  const valorTUSDTE = valorTUSD + valorTE;
  const percentualIPCIP = tarifa.ipCip?.percentual || 0;
  // TUSD/TE já vêm COM tributos embutidos — o IP-CIP incide sobre esse
  // subtotal e nada mais é somado por cima (docs/TARIFAS-FINANCEIRO.md).
  const valorIPCIP = valorTUSDTE * percentualIPCIP;
  const valorTotal = valorTUSDTE + valorIPCIP;

  const primeira = serie[0] || null;
  const ultima = serie.length > 0 ? serie[serie.length - 1] : null;

  return {
    apartamentoId: aptoID,
    competencia,
    competenciaTarifaAplicada: tarifa.competencia,
    kwhFaturado: Number(kwhFaturado.toFixed(4)),
    apartamento: {
      numero: apartamento.numero,
      predioID: apartamento.predioID,
      predioNome:
        condominio?.predios?.[apartamento.predioID]?.nome ||
        apartamento.predioID,
      condominioID: apartamento.condominioID,
      condominioNome: condominio?.nome || apartamento.condominioID,
    },
    // O que torna a fatura auditável: dá pra conferir o número contra o
    // visor do medidor sem acesso ao banco.
    periodo: {
      leituraInicial: primeira ? Number(primeira.valorKWh.toFixed(4)) : null,
      leituraFinal: ultima ? Number(ultima.valorKWh.toFixed(4)) : null,
      dataInicial: primeira ? primeira.timestamp.toISOString() : null,
      dataFinal: ultima ? ultima.timestamp.toISOString() : null,
      quantidadeLeituras: dentroPeriodo.length,
      // Menos de 2 leituras não fecha um delta: kwhFaturado sai 0 e o
      // consumidor da API precisa saber que é falta de dado, não consumo zero.
      temLeitura: serie.length >= 2,
    },
    tarifa: {
      tusd: tarifa.tusd,
      te: tarifa.te,
      ipCipPercentual: percentualIPCIP,
    },
    valores: {
      tusd: Number(valorTUSD.toFixed(2)),
      te: Number(valorTE.toFixed(2)),
      tusdMaisTe: Number(valorTUSDTE.toFixed(2)),
      ipCip: Number(valorIPCIP.toFixed(2)),
      total: Number(valorTotal.toFixed(2)),
    },
  };
}

module.exports = { calcularFatura, ordenarLeituras };
