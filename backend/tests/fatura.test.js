// Cálculo da conta de um apartamento. Este é o número que vai na fatura do
// morador e no fechamento do síndico — se ele estiver errado, alguém paga a
// conta errada. Rodar com: npm test
const { test } = require("node:test");
const assert = require("node:assert");

const { calcularFatura } = require("../utils/faturaUtils");

const APTO = { condominioID: "sol", predioID: "blocoA", numero: "101" };
const CONDOMINIO = { nome: "Residencial Sol", predios: { blocoA: { nome: "Bloco A" } } };
const TARIFA = { competencia: "2026-07", tusd: 0.5, te: 0.3, ipCip: { percentual: 0.04 } };

// db falso: responde por caminho. `leituras` é { "AAAA-MM": {id: registro} }.
function dbFake({ leituras = {}, tarifas = null, condominio = CONDOMINIO } = {}) {
  return {
    ref: (caminho) => ({
      once: async () => ({
        val: () => {
          if (caminho.startsWith("apartamentos/")) return APTO;
          if (caminho.startsWith("condominios/")) return condominio;
          if (caminho.startsWith("tarifas/")) return tarifas;
          const mes = caminho.split("/consumo/")[1];
          return leituras[mes] || null;
        },
      }),
    }),
  };
}

// Gera registros no formato do Firebase a partir de pares [dia, kWh acumulado]
function registros(pares) {
  return Object.fromEntries(
    pares.map(([dia, valorKWh], i) => [
      `push${i}`,
      { timestamp: `2026-07-${String(dia).padStart(2, "0")}T12:00:00Z`, valorKWh },
    ]),
  );
}

const contexto = { tarifa: TARIFA, apartamento: APTO, condominio: CONDOMINIO };

test("conta simples: delta do mês vezes tarifa, mais IP-CIP", async () => {
  // 100 kWh no mês: TUSD 50,00 + TE 30,00 = 80,00; IP-CIP 4% = 3,20
  const db = dbFake({ leituras: { "2026-07": registros([[1, 0], [30, 100]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);

  assert.strictEqual(f.kwhFaturado, 100);
  assert.strictEqual(f.valores.tusd, 50);
  assert.strictEqual(f.valores.te, 30);
  assert.strictEqual(f.valores.tusdMaisTe, 80);
  assert.strictEqual(f.valores.ipCip, 3.2);
  assert.strictEqual(f.valores.total, 83.2);
});

test("a última leitura do mês anterior vira baseline do mês atual", async () => {
  // Sem o baseline, o consumo do mês seria 150-120=30. Com ele, 150-100=50.
  const db = dbFake({
    leituras: {
      "2026-06": registros([[10, 80], [30, 100]]),
      "2026-07": registros([[5, 120], [28, 150]]),
    },
  });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);
  assert.strictEqual(f.kwhFaturado, 50);
  assert.strictEqual(f.periodo.leituraInicial, 100, "parte do fim do mês anterior");
  assert.strictEqual(f.periodo.leituraFinal, 150);
});

test("reinício da ESP no meio do mês não gera consumo negativo", async () => {
  // 100 -> 130 (delta 30), cai pra 5 (reinício, soma 5 inteiro), 5 -> 20 (15)
  const db = dbFake({
    leituras: { "2026-07": registros([[1, 100], [10, 130], [11, 5], [28, 20]]) },
  });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);
  assert.strictEqual(f.kwhFaturado, 50);
  assert.ok(f.valores.total > 0);
});

test("mês sem leitura nenhuma dá zero e avisa que é falta de dado", async () => {
  const db = dbFake({ leituras: {} });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);

  assert.strictEqual(f.kwhFaturado, 0);
  assert.strictEqual(f.valores.total, 0);
  assert.strictEqual(f.periodo.temLeitura, false, "zero por falta de dado, não por consumo zero");
  assert.strictEqual(f.periodo.leituraInicial, null);
});

test("uma leitura só não fecha delta e conta como sem leitura", async () => {
  const db = dbFake({ leituras: { "2026-07": registros([[15, 42]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);
  assert.strictEqual(f.kwhFaturado, 0);
  assert.strictEqual(f.periodo.temLeitura, false);
  assert.strictEqual(f.periodo.quantidadeLeituras, 1);
});

test("leitura corrompida é descartada sem derrubar o cálculo", async () => {
  const db = dbFake({
    leituras: {
      "2026-07": {
        a: { timestamp: "2026-07-01T12:00:00Z", valorKWh: 0 },
        lixo1: { timestamp: "2026-07-10T12:00:00Z", valorKWh: "abc" },
        lixo2: { valorKWh: 50 }, // sem timestamp
        b: { timestamp: "2026-07-28T12:00:00Z", valorKWh: 100 },
      },
    },
  });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);
  assert.strictEqual(f.kwhFaturado, 100);
  assert.strictEqual(f.periodo.quantidadeLeituras, 2);
});

test("sem tarifa cadastrada devolve erro 404 em vez de conta zerada", async () => {
  const db = dbFake({ leituras: { "2026-07": registros([[1, 0], [30, 100]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", {
    apartamento: APTO,
    tarifa: null,
  });
  assert.strictEqual(f.status, 404);
  assert.match(f.erro, /tarifa/i);
});

test("apartamento inexistente devolve 404", async () => {
  const db = {
    ref: () => ({ once: async () => ({ val: () => null }) }),
  };
  const f = await calcularFatura(db, "sol-blocoA-999", "2026-07");
  assert.strictEqual(f.status, 404);
});

test("nomes de prédio e condomínio entram na resposta (a fatura precisa)", async () => {
  const db = dbFake({ leituras: { "2026-07": registros([[1, 0], [30, 10]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", contexto);

  assert.strictEqual(f.apartamento.condominioNome, "Residencial Sol");
  assert.strictEqual(f.apartamento.predioNome, "Bloco A");
  assert.strictEqual(f.apartamento.numero, "101");
});

test("prédio sem nome cadastrado cai pro id em vez de sumir da fatura", async () => {
  const db = dbFake({
    leituras: { "2026-07": registros([[1, 0], [30, 10]]) },
    condominio: { nome: "Sol" },
  });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", {
    tarifa: TARIFA,
    apartamento: APTO,
  });
  assert.strictEqual(f.apartamento.predioNome, "blocoA");
});

test("tarifa aplicada pode ser de competência anterior à pedida", async () => {
  // A fatura tem que dizer QUAL tarifa usou — o síndico precisa conferir.
  const db = dbFake({ leituras: { "2026-07": registros([[1, 0], [30, 10]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", {
    apartamento: APTO,
    tarifa: { ...TARIFA, competencia: "2026-03" },
  });
  assert.strictEqual(f.competencia, "2026-07");
  assert.strictEqual(f.competenciaTarifaAplicada, "2026-03");
});

test("IP-CIP zerado não quebra e não vira NaN", async () => {
  const db = dbFake({ leituras: { "2026-07": registros([[1, 0], [30, 100]]) } });
  const f = await calcularFatura(db, "sol-blocoA-101", "2026-07", {
    apartamento: APTO,
    tarifa: { competencia: "2026-07", tusd: 0.5, te: 0.3 }, // sem ipCip
  });
  assert.strictEqual(f.valores.ipCip, 0);
  assert.strictEqual(f.valores.total, 80);
});
