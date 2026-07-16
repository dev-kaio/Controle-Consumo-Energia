const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.database();

const { authenticateToken } = require("./requires");
const { normalizarAptoId } = require("../utils/aptoUtils");

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

// Lê as leituras de UM apartamento e devolve só as que caem no intervalo.
async function lerLeiturasDoApto(aptoId, tipoDado, dataInicio, dataFim) {
  const snapshot = await db
    .ref(`leituras/${aptoId}/${tipoDado}`)
    .once("value");

  const registros = snapshot.val();
  if (!registros) return [];

  const resultado = [];
  for (const item of Object.values(registros)) {
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
  return resultado;
}

// Lista os IDs de apartamento visíveis para o usuário:
// - superadmin: todos
// - admin: apenas os do próprio condomínio
async function listarAptosVisiveis(usuario) {
  const snapshot = await db.ref("apartamentos").once("value");
  const apartamentos = snapshot.val() || {};

  return Object.entries(apartamentos)
    .filter(([, apto]) => {
      if (usuario.role === "superadmin") return true;
      return apto.condominioID === usuario.condominioID;
    })
    .map(([aptoKey]) => normalizarAptoId(aptoKey));
}

// Cria o handler de /consumo, /autoconsumo e /geracao — a lógica é idêntica,
// só muda o tipo de dado lido em leituras/{apto}/{tipoDado}.
function criarHandlerDeLeitura(tipoDado) {
  return async (req, res) => {
    try {
      const { filtro, inicio, fim } = req.query;
      // O frontend historicamente manda ora "apartamentoId", ora "aptoID" —
      // aceitamos os dois para não quebrar chamadas existentes.
      const aptoQuery = normalizarAptoId(
        req.query.apartamentoId || req.query.aptoID,
      );
      const { role, condominioID } = req.user;
      const aptoToken = normalizarAptoId(req.user.apartamentoId);

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

      // ---- Controle de acesso por papel ----
      let aptosAlvo;

      if (role === "inquilino") {
        // Inquilino só vê o próprio apartamento, sempre.
        if (!aptoToken) {
          return res
            .status(403)
            .json({ erro: "Usuário sem apartamento vinculado" });
        }
        if (aptoQuery && aptoQuery !== aptoToken) {
          return res.status(403).json({ erro: "Acesso negado" });
        }
        aptosAlvo = [aptoToken];
      } else if (aptoQuery) {
        // Admin pediu um apartamento específico: precisa ser do condomínio dele.
        if (role !== "superadmin") {
          const aptoSnap = await db
            .ref(`apartamentos/${aptoQuery}`)
            .once("value");
          const aptoData = aptoSnap.val();
          if (!aptoData || aptoData.condominioID !== condominioID) {
            return res.status(403).json({ erro: "Acesso negado" });
          }
        }
        aptosAlvo = [aptoQuery];
      } else {
        // Sem apartamento: admin recebe todos os do seu condomínio,
        // superadmin recebe todos do sistema.
        aptosAlvo = await listarAptosVisiveis(req.user);
      }

      const porApto = await Promise.all(
        aptosAlvo.map((aptoId) =>
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

module.exports = router;
