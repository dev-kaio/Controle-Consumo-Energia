const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken } = require("./requires");
const { calcularKwhFaturado } = require("../utils/consumoUtils");
const { buscarTarifaVigente } = require("../utils/tarifaUtils");
const { validarAptoId } = require("../utils/idUtils");
const { mesAnterior } = require("../utils/mesUtils");

const REGEX_COMPETENCIA = /^\d{4}-\d{2}$/;

function ordenarLeituras(registros) {
  return registros
    ? Object.values(registros)
        .filter((r) => typeof r.valorKWh === "number" && r.timestamp)
        .map((r) => ({ timestamp: new Date(r.timestamp), valorKWh: r.valorKWh }))
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];
}

// Calcula o valor da conta (TUSD, TE, IP-CIP, total) de um apartamento
// numa competência (mês) específica.
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

    const tarifa = await buscarTarifaVigente(db, aptoData.condominioID, competencia);

    if (!tarifa) {
      return res
        .status(404)
        .json({ erro: "Nenhuma tarifa cadastrada para o condomínio deste apartamento" });
    }

    // Graças à partição mensal, a conta de um mês lê só dois nós: o mês da
    // competência e o mês anterior (a última leitura dele é o "baseline" —
    // o ponto de partida do acumulado, já que valorKWh é cumulativo).
    const base = `leituras/${apartamentoId}/consumo`;
    const [mesSnap, anteriorSnap] = await Promise.all([
      db.ref(`${base}/${competencia}`).once("value"),
      db.ref(`${base}/${mesAnterior(competencia)}`).once("value"),
    ]);

    const dentroPeriodo = ordenarLeituras(mesSnap.val());
    const anteriores = ordenarLeituras(anteriorSnap.val());
    const baseline =
      anteriores.length > 0 ? [anteriores[anteriores.length - 1]] : [];

    const kwhFaturado = calcularKwhFaturado([...baseline, ...dentroPeriodo]);

    const valorTUSD = kwhFaturado * tarifa.tusd;
    const valorTE = kwhFaturado * tarifa.te;
    const valorTUSDTE = valorTUSD + valorTE;
    const percentualIPCIP = tarifa.ipCip?.percentual || 0;
    const valorIPCIP = valorTUSDTE * percentualIPCIP;
    const valorTotal = valorTUSDTE + valorIPCIP;

    res.json({
      apartamentoId,
      competencia,
      competenciaTarifaAplicada: tarifa.competencia,
      kwhFaturado: Number(kwhFaturado.toFixed(4)),
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
    });
  } catch (err) {
    console.error("Erro em /financeiro:", err);
    res.status(500).json({ erro: "Erro ao calcular financeiro" });
  }
});

module.exports = router;
