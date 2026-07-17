// Testes da lógica pura (sem rede, sem Firebase de verdade).
// Rodar com: npm test
const { test } = require("node:test");
const assert = require("node:assert");

const { calcularKwhFaturado } = require("../utils/consumoUtils");
const { buscarTarifaVigente } = require("../utils/tarifaUtils");
const { normalizarAptoId } = require("../utils/aptoUtils");

// ---------- normalizarAptoId ----------

test("normalizarAptoId adiciona prefixo quando falta", () => {
  assert.strictEqual(normalizarAptoId("202"), "apto_202");
});

test("normalizarAptoId não duplica prefixo existente", () => {
  assert.strictEqual(normalizarAptoId("apto_202"), "apto_202");
});

test("normalizarAptoId trata vazio/undefined/null como null", () => {
  assert.strictEqual(normalizarAptoId(""), null);
  assert.strictEqual(normalizarAptoId("   "), null);
  assert.strictEqual(normalizarAptoId(undefined), null);
  assert.strictEqual(normalizarAptoId(null), null);
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
