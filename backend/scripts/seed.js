/**
 * Seed do banco de teste na ESTRUTURA NOVA (IDs compostos + partição mensal).
 *
 * ATENÇÃO: apaga os nós de dados do RTDB e recria tudo do zero.
 * Por isso exige confirmação explícita:
 *
 *     node scripts/seed.js --confirmo
 *
 * O que ele cria:
 *   - condomínio "sol" com prédios blocoA e blocoB
 *   - 6 apartamentos (sol-blocoA-101 ... sol-blocoB-102)
 *   - usuários de teste (superadmin, admin do sol, 2 inquilinos)
 *     → cria no Firebase Auth se o email ainda não existir (senha: palm123)
 *   - 1 dispositivo ESP por apartamento (as chaves são impressas no final)
 *   - tarifa do mês atual pro condomínio sol
 *   - ~7 dias de leituras simuladas (consumo cumulativo + potência)
 */
const admin = require("../config/firebaseAdmin");
const crypto = require("crypto");
const { montarAptoId } = require("../utils/idUtils");
const { mesDaData } = require("../utils/mesUtils");

const db = admin.database();

const SENHA_PADRAO = "palm123";

const CONDOMINIO = {
  id: "sol",
  nome: "Residencial Sol",
  localizacao: "Rua Exemplo, 123",
  predios: {
    blocoA: { nome: "Bloco A" },
    blocoB: { nome: "Bloco B" },
  },
};

const APARTAMENTOS = [
  { predioID: "blocoA", numero: "101" },
  { predioID: "blocoA", numero: "102" },
  { predioID: "blocoA", numero: "201" },
  { predioID: "blocoA", numero: "202" },
  { predioID: "blocoB", numero: "101" },
  { predioID: "blocoB", numero: "102" },
];

const USUARIOS = [
  { email: "super@teste.com", nome: "Super Teste", tipo: "superadmin" },
  {
    email: "admin.sol@teste.com",
    nome: "Admin do Sol",
    tipo: "admin",
    condominioID: "sol",
  },
  {
    email: "ana@teste.com",
    nome: "Ana Inquilina",
    tipo: "inquilino",
    condominioID: "sol",
    aptoID: montarAptoId("sol", "blocoA", "101"),
  },
  {
    email: "bruno@teste.com",
    nome: "Bruno Inquilino",
    tipo: "inquilino",
    condominioID: "sol",
    aptoID: montarAptoId("sol", "blocoA", "102"),
  },
];

// Busca o usuário no Auth pelo email; cria se não existir.
async function garantirUsuarioAuth(email) {
  try {
    const existente = await admin.auth().getUserByEmail(email);
    return existente.uid;
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    const novo = await admin.auth().createUser({ email, password: SENHA_PADRAO });
    return novo.uid;
  }
}

// Gera ~7 dias de leituras simuladas (1 a cada 30 min), com valorKWh
// CUMULATIVO — igual a ESP real manda — e potência variando.
function gerarLeiturasSimuladas() {
  const porMes = {}; // { "2026-07": { l0: {...}, l1: {...} } }
  const agora = Date.now();
  const intervaloMs = 30 * 60 * 1000;
  const total = 7 * 48; // 7 dias × 48 leituras/dia

  let acumulado = Math.random() * 5;

  for (let i = 0; i < total; i++) {
    const ts = new Date(agora - (total - i) * intervaloMs);
    const potencia = 80 + Math.random() * 400; // watts
    acumulado += (potencia / 1000) * 0.5; // kWh em meia hora

    const mes = mesDaData(ts);
    if (!porMes[mes]) porMes[mes] = {};
    porMes[mes][`l${i}`] = {
      timestamp: ts.toISOString(),
      valorKWh: Number(acumulado.toFixed(4)),
      potencia: Number(potencia.toFixed(1)),
      corrente: Number((potencia / 220).toFixed(2)),
    };
  }

  return porMes;
}

async function main() {
  if (!process.argv.includes("--confirmo")) {
    console.log("Este script APAGA o banco e recria os dados de teste.");
    console.log("Se é isso mesmo, rode:  node scripts/seed.js --confirmo");
    process.exit(1);
  }

  console.log("Limpando nós antigos...");
  // Inclui nós da estrutura antiga (predios na raiz, moradores etc.)
  for (const no of [
    "leituras",
    "condominios",
    "predios",
    "apartamentos",
    "usuarios",
    "tarifas",
    "dispositivos",
  ]) {
    await db.ref(no).remove();
  }

  console.log("Criando condomínio e prédios...");
  await db.ref(`condominios/${CONDOMINIO.id}`).set({
    nome: CONDOMINIO.nome,
    localizacao: CONDOMINIO.localizacao,
    ativo: true,
    criadoEm: new Date().toISOString(),
    predios: CONDOMINIO.predios,
  });

  console.log("Criando apartamentos...");
  const aptoIDs = [];
  for (const apto of APARTAMENTOS) {
    const aptoID = montarAptoId(CONDOMINIO.id, apto.predioID, apto.numero);
    aptoIDs.push(aptoID);
    await db.ref(`apartamentos/${aptoID}`).set({
      condominioID: CONDOMINIO.id,
      predioID: apto.predioID,
      numero: apto.numero,
    });
  }

  console.log("Criando usuários (Auth + banco)...");
  for (const u of USUARIOS) {
    const uid = await garantirUsuarioAuth(u.email);
    const registro = {
      nome: u.nome,
      email: u.email,
      tipo: u.tipo,
      ativo: true,
    };
    if (u.condominioID) registro.condominioID = u.condominioID;
    if (u.aptoID) registro.aptoID = u.aptoID;
    await db.ref(`usuarios/${uid}`).set(registro);
    console.log(`  ${u.tipo.padEnd(10)} ${u.email} (senha: ${SENHA_PADRAO})`);
  }

  console.log("Criando dispositivos ESP...");
  const chaves = [];
  aptoIDs.forEach((aptoID, i) => {
    chaves.push({
      espId: `esp${String(i + 1).padStart(3, "0")}`,
      aptoID,
      chave: crypto.randomBytes(24).toString("hex"),
    });
  });
  for (const d of chaves) {
    const apto = APARTAMENTOS[aptoIDs.indexOf(d.aptoID)];
    await db.ref(`dispositivos/${d.espId}`).set({
      chave: d.chave,
      aptoID: d.aptoID,
      condominioID: CONDOMINIO.id,
      predioID: apto.predioID,
      ativo: true,
      criadoEm: new Date().toISOString(),
    });
  }

  console.log("Criando tarifa do mês atual...");
  const competencia = mesDaData(new Date());
  await db.ref(`tarifas/${CONDOMINIO.id}/${competencia}`).set({
    tusd: 0.5,
    te: 0.32,
    ipCip: { modo: "percentual", percentual: 0.04 },
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: "seed",
  });

  console.log("Gerando leituras simuladas (~7 dias por apto)...");
  for (const aptoID of aptoIDs) {
    const porMes = gerarLeiturasSimuladas();
    for (const [mes, registros] of Object.entries(porMes)) {
      await db.ref(`leituras/${aptoID}/consumo/${mes}`).set(registros);
    }
  }

  console.log("\n=== SEED CONCLUÍDO ===\n");
  console.log("Chaves dos dispositivos (anote — não são mostradas de novo):");
  for (const d of chaves) {
    console.log(`  ${d.espId} → ${d.aptoID}\n    chave: ${d.chave}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
