/**
 * Seed do banco de teste na ESTRUTURA NOVA (IDs compostos + partição mensal).
 *
 * ATENÇÃO: apaga os nós de dados do RTDB e recria tudo do zero.
 * Por isso exige confirmação explícita:
 *
 *     node scripts/seed.js --confirmo
 *     node scripts/seed.js --confirmo --aptos=1000   (massa de escala)
 *
 * O que ele cria:
 *   - condomínio "sol" com prédios blocoA e blocoB
 *   - 6 apartamentos (sol-blocoA-101 ... sol-blocoB-102)
 *   - usuários de teste (superadmin, admin do sol, 2 inquilinos)
 *     → cria no Firebase Auth se o email ainda não existir (senha: palm123)
 *   - 1 dispositivo ESP por apartamento (as chaves são impressas no final)
 *   - tarifa do mês atual pro condomínio sol
 *   - ~7 dias de leituras simuladas (consumo cumulativo + potência)
 *
 * --aptos=N gera N apartamentos espalhados em 3 prédios, pra testar o que só
 * dói em escala: a lista da Estrutura, o seletor em cascata e o fechamento de
 * competência. Pra não despejar dezenas de MB no Firebase de teste, seed
 * grande gera menos dias de leitura por apartamento e deixa ~15% SEM leitura
 * nenhuma — que é exatamente a coluna "sem leitura" do fechamento, um caso
 * que precisa ser visto acontecendo.
 */
const admin = require("../config/firebaseAdmin");
const crypto = require("crypto");
const { montarAptoId } = require("../utils/idUtils");
const { mesDaData } = require("../utils/mesUtils");

const db = admin.database();

const SENHA_PADRAO = "palm123";

// Chave FIXA do esp001, pro teste com hardware real (ESP → ngrok → backend).
// As demais são aleatórias a cada seed; esta é conhecida e estável pra poder
// gravar no firmware uma vez e não quebrar o teste a cada reseed. Tem que ser
// idêntica a `espChave` no firmware/esp.cpp. NÃO usar em produção.
const CHAVE_ESP_TESTE = "e5910b3d0f1c4a7b8d2e6f90a1b2c3d4e5f60718293a4b5c";

// --aptos=N ligado? Vale a massa de escala em vez da lista fixa.
const QTD_ESCALA = (() => {
  const arg = process.argv.find((a) => a.startsWith("--aptos="));
  const n = arg ? Number(arg.split("=")[1]) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
})();

const CONDOMINIO = {
  id: "sol",
  nome: "Residencial Sol",
  localizacao: "Rua Exemplo, 123",
  predios: {
    blocoA: { nome: "Bloco A" },
    blocoB: { nome: "Bloco B" },
    // Só existe na massa de escala: com 3 prédios dá pra ver o agrupamento
    // da lista de apartamentos fazendo o trabalho dele.
    ...(QTD_ESCALA ? { blocoC: { nome: "Bloco C" } } : {}),
  },
};

const APARTAMENTOS_PADRAO = [
  { predioID: "blocoA", numero: "101" },
  { predioID: "blocoA", numero: "102" },
  { predioID: "blocoA", numero: "201" },
  { predioID: "blocoA", numero: "202" },
  { predioID: "blocoB", numero: "101" },
  { predioID: "blocoB", numero: "102" },
];

// Numeração realista: 4 apartamentos por andar, andar começando no 1.
// Apto 9 do blocoA vira "301" — e não "9", que ordenaria errado na tela.
function gerarApartamentosEmEscala(quantidade) {
  const predios = Object.keys(CONDOMINIO.predios);
  const lista = [];

  for (let i = 0; i < quantidade; i++) {
    const predioID = predios[i % predios.length];
    const indiceNoPredio = Math.floor(i / predios.length);
    const andar = Math.floor(indiceNoPredio / 4) + 1;
    const unidade = (indiceNoPredio % 4) + 1;
    lista.push({ predioID, numero: `${andar}${String(unidade).padStart(2, "0")}` });
  }
  return lista;
}

const APARTAMENTOS = QTD_ESCALA
  ? gerarApartamentosEmEscala(QTD_ESCALA)
  : APARTAMENTOS_PADRAO;

// Seed pequeno: 7 dias cheios (o dashboard fica bonito). Seed grande: 1 dia,
// senão são centenas de MB. Dois pontos já bastam pra fechar uma conta.
const DIAS_DE_LEITURA = QTD_ESCALA > 100 ? 1 : 7;
// Fração dos apartamentos que fica sem medidor/leitura na massa de escala.
const FATIA_SEM_LEITURA = 0.15;

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

// Gera leituras simuladas (1 a cada 30 min), com valorKWh CUMULATIVO —
// igual a ESP real manda — e potência variando.
function gerarLeiturasSimuladas() {
  const porMes = {}; // { "2026-07": { l0: {...}, l1: {...} } }
  const agora = Date.now();
  const intervaloMs = 30 * 60 * 1000;
  const total = DIAS_DE_LEITURA * 48; // 48 leituras/dia

  let acumulado = Math.random() * 5;

  for (let i = 0; i < total; i++) {
    // A ÚLTIMA leitura cai em "agora" (por isso o -1), não meia hora atrás:
    // senão o card de potência já nasce em alerta de "sem leitura recente",
    // e quem acabou de rodar o seed acha que quebrou. Passados uns minutos
    // sem ninguém alimentar o banco, o alerta aparece — e aí está certo.
    const ts = new Date(agora - (total - 1 - i) * intervaloMs);
    const potencia = 80 + Math.random() * 400; // watts
    acumulado += (potencia / 1000) * 0.5; // kWh em meia hora

    const mes = mesDaData(ts);
    if (!porMes[mes]) porMes[mes] = {};
    // PUSH ID DE VERDADE, não "l0", "l1"... — push() sem argumento gera a
    // chave localmente, sem ida ao servidor.
    //
    // Por que importa: push id é cronológico por construção, e quem lê a
    // "última leitura" conta com isso (orderByKey().limitToLast()). Chave
    // sequencial simples ordena LEXICOGRAFICAMENTE — "l99" > "l335" —, e o
    // dashboard passava a mostrar uma leitura de dias atrás como se fosse a
    // de agora. O seed simula a ESP: tem que gravar do mesmo jeito que ela
    // (routes/espsync.js usa push()).
    porMes[mes][db.ref().push().key] = {
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

  console.log(`Criando ${APARTAMENTOS.length} apartamentos...`);
  // Um update() só em vez de N set(): com 1000 apartamentos, escrever um a um
  // seriam 1000 idas ao Firebase (~3 minutos) em vez de uma.
  const aptoIDs = [];
  const lote = {};
  for (const apto of APARTAMENTOS) {
    const aptoID = montarAptoId(CONDOMINIO.id, apto.predioID, apto.numero);
    aptoIDs.push(aptoID);
    lote[aptoID] = {
      condominioID: CONDOMINIO.id,
      predioID: apto.predioID,
      numero: apto.numero,
    };
  }
  await db.ref("apartamentos").update(lote);

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

  // Os últimos ~15% ficam sem medidor e sem leitura na massa de escala: é
  // como o síndico vê, no fechamento, quais apartamentos não mediram.
  const comMedidor = QTD_ESCALA
    ? Math.max(1, Math.round(aptoIDs.length * (1 - FATIA_SEM_LEITURA)))
    : aptoIDs.length;

  console.log(`Criando ${comMedidor} dispositivos ESP...`);
  const chaves = aptoIDs.slice(0, comMedidor).map((aptoID, i) => ({
    espId: `esp${String(i + 1).padStart(3, "0")}`,
    aptoID,
    chave: crypto.randomBytes(24).toString("hex"),
  }));

  // esp001 ganha a chave fixa de teste (as outras seguem aleatórias)
  if (chaves[0]) chaves[0].chave = CHAVE_ESP_TESTE;

  const loteDisp = {};
  for (const d of chaves) {
    const apto = APARTAMENTOS[aptoIDs.indexOf(d.aptoID)];
    loteDisp[d.espId] = {
      chave: d.chave,
      aptoID: d.aptoID,
      condominioID: CONDOMINIO.id,
      predioID: apto.predioID,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
  }
  await db.ref("dispositivos").update(loteDisp);

  console.log("Criando tarifa do mês atual...");
  const competencia = mesDaData(new Date());
  await db.ref(`tarifas/${CONDOMINIO.id}/${competencia}`).set({
    tusd: 0.5,
    te: 0.32,
    ipCip: { modo: "percentual", percentual: 0.04 },
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: "seed",
  });

  console.log(
    `Gerando leituras simuladas (${DIAS_DE_LEITURA} dia(s) × ${comMedidor} aptos)...`,
  );
  // Em fatias: um update() único com 1000 apartamentos × 48 leituras seria um
  // payload de dezenas de MB numa requisição só, e o Firebase recusa.
  const FATIA = 25;
  const comLeitura = aptoIDs.slice(0, comMedidor);
  for (let i = 0; i < comLeitura.length; i += FATIA) {
    const multi = {};
    for (const aptoID of comLeitura.slice(i, i + FATIA)) {
      for (const [mes, registros] of Object.entries(gerarLeiturasSimuladas())) {
        multi[`${aptoID}/consumo/${mes}`] = registros;
      }
    }
    await db.ref("leituras").update(multi);
    if (comLeitura.length > FATIA) {
      console.log(
        `  ${Math.min(i + FATIA, comLeitura.length)}/${comLeitura.length}`,
      );
    }
  }

  console.log("\n=== SEED CONCLUÍDO ===\n");
  console.log(
    `${aptoIDs.length} apartamentos · ${comMedidor} com medidor · ` +
      `${aptoIDs.length - comMedidor} sem leitura`,
  );

  // Numa massa de escala, despejar 850 chaves no terminal não ajuda ninguém.
  const MOSTRAR = 10;
  console.log("\nChaves dos dispositivos (anote — não são mostradas de novo):");
  for (const d of chaves.slice(0, MOSTRAR)) {
    console.log(`  ${d.espId} → ${d.aptoID}\n    chave: ${d.chave}`);
  }
  if (chaves.length > MOSTRAR) {
    console.log(`  ... e mais ${chaves.length - MOSTRAR} (rode de novo se precisar)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
