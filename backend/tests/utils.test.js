// Testes da lógica pura (sem rede, sem Firebase de verdade).
// Rodar com: npm test
const { test } = require("node:test");
const assert = require("node:assert");

const { calcularKwhFaturado } = require("../utils/consumoUtils");
const { buscarTarifaVigente } = require("../utils/tarifaUtils");
const { validarAptoId, montarAptoId, validarSegmento } = require("../utils/idUtils");
const { mesDaData, mesesNoIntervalo, mesAnterior } = require("../utils/mesUtils");

// ---------- IDs compostos ----------

test("montarAptoId monta condominio-predio-numero", () => {
  assert.strictEqual(montarAptoId("sol", "blocoA", "101"), "sol-blocoA-101");
});

test("montarAptoId rejeita segmento com hífen ou vazio", () => {
  assert.strictEqual(montarAptoId("sol", "bloco-A", "101"), null);
  assert.strictEqual(montarAptoId("", "blocoA", "101"), null);
  assert.strictEqual(montarAptoId("sol", "blocoA", "../x"), null);
});

test("validarAptoId aceita só o formato composto", () => {
  assert.strictEqual(validarAptoId("sol-blocoA-101"), true);
  assert.strictEqual(validarAptoId("apto_101"), false);
  assert.strictEqual(validarAptoId("sol-blocoA"), false);
  assert.strictEqual(validarAptoId("../usuarios"), false);
  assert.strictEqual(validarAptoId(undefined), false);
});

test("validarSegmento aceita só letras e números", () => {
  assert.strictEqual(validarSegmento("blocoA"), true);
  assert.strictEqual(validarSegmento("bloco A"), false);
  assert.strictEqual(validarSegmento("bloco-A"), false);
});

// ---------- partições mensais ----------

test("mesDaData formata AAAA-MM em UTC", () => {
  assert.strictEqual(mesDaData(new Date("2026-07-16T10:00:00Z")), "2026-07");
  assert.strictEqual(mesDaData("2026-01-05T00:00:00Z"), "2026-01");
  assert.strictEqual(mesDaData("data inválida"), null);
});

test("mesesNoIntervalo lista as competências das pontas inclusive", () => {
  const meses = mesesNoIntervalo(
    new Date("2026-05-20T00:00:00Z"),
    new Date("2026-07-03T00:00:00Z"),
  );
  assert.deepStrictEqual(meses, ["2026-05", "2026-06", "2026-07"]);
});

test("mesAnterior atravessa a virada de ano", () => {
  assert.strictEqual(mesAnterior("2026-01"), "2025-12");
  assert.strictEqual(mesAnterior("2026-07"), "2026-06");
});

// ---------- calcularKwhFaturado ----------

function leitura(ts, kwh) {
  return { timestamp: new Date(ts), valorKWh: kwh };
}

test("kWh faturado soma deltas de leituras cumulativas", () => {
  const total = calcularKwhFaturado([
    leitura("2026-07-01T00:00:00Z", 10),
    leitura("2026-07-02T00:00:00Z", 12.5),
    leitura("2026-07-03T00:00:00Z", 15),
  ]);
  assert.strictEqual(total, 5);
});

test("kWh faturado detecta reinício da ESP (valor caiu)", () => {
  // 10 -> 14 (delta 4), reinício: 14 -> 0.5 (soma 0.5), 0.5 -> 2 (delta 1.5)
  const total = calcularKwhFaturado([
    leitura("2026-07-01T00:00:00Z", 10),
    leitura("2026-07-02T00:00:00Z", 14),
    leitura("2026-07-03T00:00:00Z", 0.5),
    leitura("2026-07-04T00:00:00Z", 2),
  ]);
  assert.strictEqual(total, 6);
});

test("kWh faturado com menos de 2 leituras é 0", () => {
  assert.strictEqual(calcularKwhFaturado([]), 0);
  assert.strictEqual(calcularKwhFaturado([leitura("2026-07-01", 10)]), 0);
  assert.strictEqual(calcularKwhFaturado(null), 0);
});

// ---------- buscarTarifaVigente ----------

// db falso: só o que a função usa (ref().once("value") -> snapshot.val())
function dbFake(tarifasDoCondominio) {
  return {
    ref: () => ({
      once: async () => ({ val: () => tarifasDoCondominio }),
    }),
  };
}

test("tarifa exata da competência é usada quando existe", async () => {
  const db = dbFake({
    "2026-06": { tusd: 0.5, te: 0.3, ipCip: { percentual: 0.04 } },
    "2026-07": { tusd: 0.6, te: 0.35, ipCip: { percentual: 0.04 } },
  });
  const t = await buscarTarifaVigente(db, "condo_1", "2026-07");
  assert.strictEqual(t.competencia, "2026-07");
  assert.strictEqual(t.tusd, 0.6);
});

test("sem tarifa exata, cai para a competência anterior mais recente", async () => {
  const db = dbFake({
    "2026-01": { tusd: 0.4, te: 0.25, ipCip: { percentual: 0.04 } },
    "2026-05": { tusd: 0.5, te: 0.3, ipCip: { percentual: 0.04 } },
  });
  const t = await buscarTarifaVigente(db, "condo_1", "2026-07");
  assert.strictEqual(t.competencia, "2026-05");
});

test("sem nenhuma tarifa anterior, retorna null", async () => {
  const db = dbFake({
    "2026-08": { tusd: 0.5, te: 0.3, ipCip: { percentual: 0.04 } },
  });
  const t = await buscarTarifaVigente(db, "condo_1", "2026-07");
  assert.strictEqual(t, null);

  const vazio = await buscarTarifaVigente(dbFake(null), "condo_1", "2026-07");
  assert.strictEqual(vazio, null);
});
