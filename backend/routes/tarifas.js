const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.database();

const { authenticateToken, requireRole } = require("./requires");

const REGEX_COMPETENCIA = /^\d{4}-\d{2}$/;

// Salvar/atualizar a tarifa de um condomínio para uma competência (mês)
router.post("/", authenticateToken, requireRole("superadmin"), async (req, res) => {
  try {
    const { condominioID, competencia, tusd, te, ipCipPercentual } = req.body;

    if (!condominioID || !competencia) {
      return res
        .status(400)
        .json({ erro: "condominioID e competencia são obrigatórios" });
    }

    if (!REGEX_COMPETENCIA.test(competencia)) {
      return res
        .status(400)
        .json({ erro: "competencia deve estar no formato AAAA-MM (ex: 2026-01)" });
    }

    if (
      typeof tusd !== "number" ||
      typeof te !== "number" ||
      typeof ipCipPercentual !== "number"
    ) {
      return res
        .status(400)
        .json({ erro: "tusd, te e ipCipPercentual devem ser números" });
    }

    if (tusd < 0 || te < 0 || ipCipPercentual < 0) {
      return res.status(400).json({ erro: "Valores não podem ser negativos" });
    }

    const tarifa = {
      tusd,
      te,
      ipCip: {
        modo: "percentual",
        percentual: ipCipPercentual,
      },
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: req.user.uid,
    };

    await db.ref(`tarifas/${condominioID}/${competencia}`).set(tarifa);

    res.json({ sucesso: true, condominioID, competencia, tarifa });
  } catch (err) {
    console.error("Erro ao salvar tarifa:", err);
    res.status(500).json({ erro: "Erro ao salvar tarifa" });
  }
});

// Listar todas as competências cadastradas de um condomínio
router.get(
  "/:condominioID",
  authenticateToken,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { condominioID } = req.params;
      const snapshot = await db.ref(`tarifas/${condominioID}`).once("value");
      const tarifas = snapshot.val() || {};
      res.json({ condominioID, tarifas });
    } catch (err) {
      console.error("Erro ao buscar tarifas:", err);
      res.status(500).json({ erro: "Erro ao buscar tarifas" });
    }
  },
);

module.exports = router;