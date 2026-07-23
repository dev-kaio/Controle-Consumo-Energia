const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken, requireRole } = require("./requires");
const { calcularFatura } = require("../utils/faturaUtils");
const { buscarTarifaVigente } = require("../utils/tarifaUtils");
const { validarAptoId, validarSegmento } = require("../utils/idUtils");

const REGEX_COMPETENCIA = /^\d{4}-\d{2}$/;

// Quantos apartamentos calcular ao mesmo tempo. Cada um lê 2 nós de leitura,
// então um condomínio de 1000 aptos são 2000 leituras: disparar tudo de uma
// vez estoura o pool de conexões do Admin SDK e o Firebase começa a recusar.
const LOTE = 25;

async function emLotes(itens, tamanho, tarefa) {
  const resultados = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    const fatia = itens.slice(i, i + tamanho);
    resultados.push(...(await Promise.all(fatia.map(tarefa))));
  }
  return resultados;
}

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

/* ==========================
   FECHAMENTO DE COMPETÊNCIA
========================== */

// A conta de TODOS os apartamentos de um condomínio num mês.
//
// É relatório recalculado, não registro contábil: nada é gravado, rodar de
// novo recalcula. Consequência que precisa estar clara pra quem usa — corrigir
// a tarifa depois muda retroativamente uma conta já entregue ao morador.
//
// A economia que faz isso rodar em 1000 apartamentos: tarifa, condomínio e
// lista de moradores são lidos UMA vez e passados pro calcularFatura. Sem
// isso seriam ~4 leituras por apto em vez de 2.
router.get(
  "/fechamento",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const { competencia } = req.query;
      // Admin fecha sempre o próprio condomínio, venha o que vier na query.
      const condominioID =
        req.user.role === "superadmin"
          ? req.query.condominioID
          : req.user.condominioID;

      if (!condominioID || !competencia) {
        return res
          .status(400)
          .json({ erro: "condominioID e competencia são obrigatórios" });
      }
      if (!validarSegmento(condominioID)) {
        return res.status(400).json({ erro: "condominioID inválido" });
      }
      if (!REGEX_COMPETENCIA.test(competencia)) {
        return res.status(400).json({
          erro: "competencia deve estar no formato AAAA-MM (ex: 2026-01)",
        });
      }

      const [condoSnap, aptosSnap, usuariosSnap] = await Promise.all([
        db.ref(`condominios/${condominioID}`).once("value"),
        db.ref("apartamentos").once("value"),
        db.ref("usuarios").once("value"),
      ]);

      const condominio = condoSnap.val();
      if (!condominio) {
        return res.status(404).json({ erro: "Condomínio não encontrado" });
      }

      const tarifa = await buscarTarifaVigente(db, condominioID, competencia);
      if (!tarifa) {
        return res.status(404).json({
          erro: "Nenhuma tarifa cadastrada para o condomínio deste apartamento",
        });
      }

      const doCondominio = Object.entries(aptosSnap.val() || {}).filter(
        ([, apto]) => apto.condominioID === condominioID,
      );

      // aptoID -> nome do morador (só inquilino ativo tem apartamento)
      const moradorPorApto = {};
      for (const u of Object.values(usuariosSnap.val() || {})) {
        if (u.aptoID) moradorPorApto[u.aptoID] = u.nome || null;
      }

      const linhas = await emLotes(doCondominio, LOTE, async ([aptoID, apto]) => {
        const f = await calcularFatura(db, aptoID, competencia, {
          apartamento: apto,
          condominio,
          tarifa,
        });

        const base = {
          aptoID,
          numero: apto.numero,
          predioID: apto.predioID,
          predioNome: condominio.predios?.[apto.predioID]?.nome || apto.predioID,
          morador: moradorPorApto[aptoID] || null,
        };

        // Com apartamento e tarifa injetados o cálculo não tem como falhar,
        // mas um apartamento problemático não pode derrubar o fechamento
        // inteiro do condomínio — ele entra como "sem leitura".
        if (f.erro) {
          console.error(`Fechamento: apto ${aptoID} falhou — ${f.erro}`);
          return { ...base, kwhFaturado: 0, total: 0, temLeitura: false };
        }

        return {
          ...base,
          kwhFaturado: f.kwhFaturado,
          total: f.valores.total,
          temLeitura: f.periodo.temLeitura,
        };
      });

      // Prédio, depois número — "101" antes de "1002" (ordenação numérica,
      // não alfabética).
      linhas.sort(
        (a, b) =>
          String(a.predioID).localeCompare(String(b.predioID), "pt-BR") ||
          String(a.numero).localeCompare(String(b.numero), "pt-BR", {
            numeric: true,
          }),
      );

      const soma = (campo) => linhas.reduce((t, l) => t + (l[campo] || 0), 0);
      const semLeitura = linhas.filter((l) => !l.temLeitura).length;

      res.json({
        condominioID,
        condominioNome: condominio.nome || condominioID,
        competencia,
        competenciaTarifaAplicada: tarifa.competencia,
        tarifa: {
          tusd: tarifa.tusd,
          te: tarifa.te,
          ipCipPercentual: tarifa.ipCip?.percentual || 0,
        },
        aptos: linhas,
        totais: {
          apartamentos: linhas.length,
          // Apartamento sem leitura entra na lista com total 0 e sinalizado:
          // sumir com a linha esconderia medidor quebrado do síndico.
          semLeitura,
          kwhFaturado: Number(soma("kwhFaturado").toFixed(4)),
          total: Number(soma("total").toFixed(2)),
        },
      });
    } catch (err) {
      console.error("Erro em /financeiro/fechamento:", err);
      res.status(500).json({ erro: "Erro ao calcular financeiro" });
    }
  },
);

module.exports = router;
