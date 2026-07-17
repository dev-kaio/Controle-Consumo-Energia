const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const crypto = require("crypto");
const db = admin.database();

const { authenticateToken, requireRole } = require("./requires");
const { validarSegmento, montarAptoId } = require("../utils/idUtils");

// Estrutura física do sistema: condomínio > prédio > apartamento > dispositivo.
//
// Quem pode o quê (decisão de produto):
// - superadmin: faz o onboarding — cria o condomínio e o primeiro admin
// - admin: cadastra prédios, apartamentos e dispositivos DO SEU condomínio
//
// Resolve qual condomínio a operação atinge: superadmin escolhe no body,
// admin usa sempre o do próprio token (nunca o do body).
function condominioDaRequisicao(req) {
  return req.user.role === "superadmin"
    ? req.body.condominioID
    : req.user.condominioID;
}

/* ==========================
   CONDOMÍNIOS
========================== */

// Criar condomínio (só superadmin — é o onboarding de um cliente novo)
router.post(
  "/condominios",
  authenticateToken,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { id, nome, localizacao } = req.body;

      if (!validarSegmento(id)) {
        return res.status(400).json({
          erro: "id deve ter só letras e números (ex: 'sol'), sem hífen",
        });
      }
      if (!nome) {
        return res.status(400).json({ erro: "nome é obrigatório" });
      }

      const existente = await db.ref(`condominios/${id}`).once("value");
      if (existente.exists()) {
        return res.status(409).json({ erro: "Já existe condomínio com esse id" });
      }

      await db.ref(`condominios/${id}`).set({
        nome,
        localizacao: localizacao || "",
        ativo: true,
        criadoEm: new Date().toISOString(),
      });

      res.json({ sucesso: true, condominioID: id });
    } catch (err) {
      console.error("Erro ao criar condomínio:", err);
      res.status(500).json({ erro: "Erro ao criar condomínio" });
    }
  },
);

// Listar condomínios (superadmin vê todos; admin vê só o seu)
router.get(
  "/condominios",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      if (req.user.role === "superadmin") {
        const snap = await db.ref("condominios").once("value");
        return res.json({ condominios: snap.val() || {} });
      }

      const snap = await db
        .ref(`condominios/${req.user.condominioID}`)
        .once("value");
      const condo = snap.val();
      res.json({
        condominios: condo ? { [req.user.condominioID]: condo } : {},
      });
    } catch (err) {
      console.error("Erro ao listar condomínios:", err);
      res.status(500).json({ erro: "Erro ao listar condomínios" });
    }
  },
);

/* ==========================
   PRÉDIOS (vivem DENTRO do condomínio — sem nó solto na raiz)
========================== */

router.post(
  "/predios",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const condominioID = condominioDaRequisicao(req);
      const { id, nome } = req.body;

      if (!validarSegmento(condominioID)) {
        return res.status(400).json({ erro: "condominioID inválido" });
      }
      if (!validarSegmento(id)) {
        return res.status(400).json({
          erro: "id deve ter só letras e números (ex: 'blocoA'), sem hífen",
        });
      }

      const condoSnap = await db.ref(`condominios/${condominioID}`).once("value");
      if (!condoSnap.exists()) {
        return res.status(404).json({ erro: "Condomínio não encontrado" });
      }

      await db.ref(`condominios/${condominioID}/predios/${id}`).set({
        nome: nome || id,
      });

      res.json({ sucesso: true, condominioID, predioID: id });
    } catch (err) {
      console.error("Erro ao criar prédio:", err);
      res.status(500).json({ erro: "Erro ao criar prédio" });
    }
  },
);

/* ==========================
   APARTAMENTOS
========================== */

router.post(
  "/apartamentos",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const condominioID = condominioDaRequisicao(req);
      const { predioID, numero } = req.body;

      const aptoID = montarAptoId(condominioID, predioID, numero);
      if (!aptoID) {
        return res.status(400).json({
          erro: "condominioID, predioID e numero devem ter só letras e números",
        });
      }

      const predioSnap = await db
        .ref(`condominios/${condominioID}/predios/${predioID}`)
        .once("value");
      if (!predioSnap.exists()) {
        return res
          .status(404)
          .json({ erro: "Prédio não encontrado nesse condomínio" });
      }

      const existente = await db.ref(`apartamentos/${aptoID}`).once("value");
      if (existente.exists()) {
        return res.status(409).json({ erro: "Apartamento já cadastrado" });
      }

      await db.ref(`apartamentos/${aptoID}`).set({
        condominioID,
        predioID,
        numero,
      });

      res.json({ sucesso: true, aptoID });
    } catch (err) {
      console.error("Erro ao criar apartamento:", err);
      res.status(500).json({ erro: "Erro ao criar apartamento" });
    }
  },
);

// Listar apartamentos (admin: só do seu condomínio; superadmin: todos,
// ou de um condomínio via ?condominioID=)
router.get(
  "/apartamentos",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const filtroCondo =
        req.user.role === "superadmin"
          ? req.query.condominioID || null
          : req.user.condominioID;

      const snap = await db.ref("apartamentos").once("value");
      const todos = snap.val() || {};

      const resultado = {};
      for (const [aptoID, apto] of Object.entries(todos)) {
        if (filtroCondo && apto.condominioID !== filtroCondo) continue;
        resultado[aptoID] = apto;
      }

      res.json({ apartamentos: resultado });
    } catch (err) {
      console.error("Erro ao listar apartamentos:", err);
      res.status(500).json({ erro: "Erro ao listar apartamentos" });
    }
  },
);

/* ==========================
   DISPOSITIVOS (ESP32 ↔ apartamento)
========================== */

// Cadastrar dispositivo: vincula uma ESP a um apartamento e gera a chave
// que ela vai usar pra autenticar. Trocar a ESP de apto = editar 1 campo,
// sem regravar firmware com dados de apartamento.
router.post(
  "/dispositivos",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const { espId, aptoID } = req.body;

      if (!validarSegmento(espId)) {
        return res.status(400).json({
          erro: "espId deve ter só letras e números (ex: 'esp001')",
        });
      }

      const aptoSnap = await db.ref(`apartamentos/${aptoID || "_"}`).once("value");
      const apto = aptoSnap.val();
      if (!apto) {
        return res.status(404).json({ erro: "Apartamento não encontrado" });
      }

      // Admin só vincula dispositivo a apto do próprio condomínio
      if (
        req.user.role !== "superadmin" &&
        apto.condominioID !== req.user.condominioID
      ) {
        return res.status(403).json({ erro: "Acesso negado" });
      }

      const existente = await db.ref(`dispositivos/${espId}`).once("value");
      if (existente.exists()) {
        return res.status(409).json({ erro: "Já existe dispositivo com esse id" });
      }

      // Chave individual por dispositivo — dá pra revogar UMA ESP sem
      // afetar as outras (a ESP_KEY global única não permitia isso)
      const chave = crypto.randomBytes(24).toString("hex");

      await db.ref(`dispositivos/${espId}`).set({
        chave,
        aptoID,
        condominioID: apto.condominioID,
        predioID: apto.predioID,
        ativo: true,
        criadoEm: new Date().toISOString(),
      });

      // A chave só é mostrada AQUI, na criação — anote e configure na ESP
      res.json({ sucesso: true, espId, aptoID, chave });
    } catch (err) {
      console.error("Erro ao criar dispositivo:", err);
      res.status(500).json({ erro: "Erro ao criar dispositivo" });
    }
  },
);

// Listar dispositivos (sem expor a chave; admin vê só os do seu condomínio)
router.get(
  "/dispositivos",
  authenticateToken,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const snap = await db.ref("dispositivos").once("value");
      const todos = snap.val() || {};

      const resultado = {};
      for (const [espId, disp] of Object.entries(todos)) {
        if (
          req.user.role !== "superadmin" &&
          disp.condominioID !== req.user.condominioID
        )
          continue;
        const { chave, ...semChave } = disp;
        resultado[espId] = semChave;
      }

      res.json({ dispositivos: resultado });
    } catch (err) {
      console.error("Erro ao listar dispositivos:", err);
      res.status(500).json({ erro: "Erro ao listar dispositivos" });
    }
  },
);

module.exports = router;
