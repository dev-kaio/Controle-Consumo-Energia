// Testes das funções puras de agregação — rodam com `npm test`
// (node --test, mesmo padrão do backend; sem framework extra).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chaveDoPeriodo,
  agruparPorPeriodo,
  alinharSeries,
  calcularMedia,
  agrupamentoAutomatico,
  deveUsarBarras,
  totaisPorApartamento,
} from "./agregacao.js";

// timestamps fixos (hora local) pra os testes não dependerem do relógio
const t = (ano, mes, dia, hora = 0, min = 0) =>
  new Date(ano, mes - 1, dia, hora, min).getTime();

test("chaveDoPeriodo trunca pro início do período", () => {
  const ts = t(2025, 3, 15, 14, 37);
  assert.equal(chaveDoPeriodo(ts, "ano"), t(2025, 1, 1));
  assert.equal(chaveDoPeriodo(ts, "mes"), t(2025, 3, 1));
  assert.equal(chaveDoPeriodo(ts, "dia"), t(2025, 3, 15));
  assert.equal(chaveDoPeriodo(ts, "hora"), ts); // ponto a ponto
  assert.equal(chaveDoPeriodo(ts, "raw"), ts);
});

test("agruparPorPeriodo soma leituras do mesmo dia (virada de mês ok)", () => {
  const itens = [
    { timestamp: t(2025, 1, 31, 8), valorKWh: 1.5 },
    { timestamp: t(2025, 1, 31, 20), valorKWh: 2.5 },
    { timestamp: t(2025, 2, 1, 0, 5), valorKWh: 3 },
  ];
  const grupos = agruparPorPeriodo(itens, "dia");
  assert.equal(grupos.size, 2);
  assert.equal(grupos.get(t(2025, 1, 31)), 4);
  assert.equal(grupos.get(t(2025, 2, 1)), 3);
});

test("agruparPorPeriodo por mês atravessa a virada de ano em ordem", () => {
  const itens = [
    { timestamp: t(2025, 1, 10), valorKWh: 5 },
    { timestamp: t(2024, 12, 20), valorKWh: 7 },
  ];
  const grupos = agruparPorPeriodo(itens, "mes");
  const { chaves } = alinharSeries({ x: grupos });
  // dez/2024 vem ANTES de jan/2025 (ordenação numérica = temporal;
  // por string, "01/2025" < "12/2024" daria ordem errada)
  assert.deepEqual(chaves, [t(2024, 12, 1), t(2025, 1, 1)]);
});

test("agruparPorPeriodo ignora timestamp inválido e valor ausente", () => {
  const itens = [
    { timestamp: "não-é-data", valorKWh: 9 },
    { timestamp: t(2025, 5, 1), valorKWh: undefined },
  ];
  const grupos = agruparPorPeriodo(itens, "dia");
  assert.equal(grupos.size, 1);
  assert.equal(grupos.get(t(2025, 5, 1)), 0);
});

test("alinharSeries preenche 0 onde um tipo não tem leitura", () => {
  const consumo = agruparPorPeriodo(
    [
      { timestamp: t(2025, 6, 1), valorKWh: 2 },
      { timestamp: t(2025, 6, 3), valorKWh: 4 },
    ],
    "dia",
  );
  const geracao = agruparPorPeriodo(
    [{ timestamp: t(2025, 6, 2), valorKWh: 8 }],
    "dia",
  );

  const { chaves, series } = alinharSeries({ consumo, geracao });
  assert.equal(chaves.length, 3);
  assert.deepEqual(series.consumo, [2, 0, 4]);
  assert.deepEqual(series.geracao, [0, 8, 0]);
});

test("alinharSeries com tudo vazio devolve eixos vazios", () => {
  const { chaves, series } = alinharSeries({
    consumo: new Map(),
    geracao: new Map(),
  });
  assert.deepEqual(chaves, []);
  assert.deepEqual(series.consumo, []);
});

test("calcularMedia só conta períodos com leitura (>0)", () => {
  // 5 dias com dado num mês de 30 — média por dia COM dado (decisão herdada)
  assert.equal(calcularMedia([1.2, 0, 1.5, 2.1, 0, 1.8, 2.3]), 1.78);
  assert.equal(calcularMedia([]), 0);
  assert.equal(calcularMedia([0, 0]), 0);
});

test("agrupamentoAutomatico usa os mesmos cortes do app antigo", () => {
  assert.equal(agrupamentoAutomatico(t(2023, 1, 1), t(2025, 1, 2)), "ano");
  assert.equal(agrupamentoAutomatico(t(2025, 1, 1), t(2025, 3, 15)), "mes");
  assert.equal(agrupamentoAutomatico(t(2025, 1, 1), t(2025, 1, 3)), "dia");
  assert.equal(agrupamentoAutomatico(t(2025, 1, 1, 8), t(2025, 1, 1, 12)), "hora");
  assert.equal(agrupamentoAutomatico(t(2025, 1, 2), t(2025, 1, 1)), "raw");
});

test("deveUsarBarras: barras pra agregados, linha pra ponto a ponto", () => {
  assert.equal(deveUsarBarras("semana", "dia"), true);
  assert.equal(deveUsarBarras("inicio", "ano"), true);
  assert.equal(deveUsarBarras("hora", "hora"), false);
  assert.equal(deveUsarBarras("dia", "hora"), false);
  assert.equal(deveUsarBarras(null, "mes"), true); // intervalo custom longo
  assert.equal(deveUsarBarras(null, "raw"), false);
});

test("totaisPorApartamento soma os 3 tipos por apto", () => {
  const totais = totaisPorApartamento({
    consumo: [
      { aptoID: "sol-blocoA-101", valorKWh: 2 },
      { aptoID: "sol-blocoA-101", valorKWh: 3 },
      { aptoID: "sol-blocoA-102", valorKWh: 1 },
      { valorKWh: 99 }, // sem apto: ignorado
    ],
    geracao: [{ aptoID: "sol-blocoA-101", valorKWh: 7 }],
  });
  assert.deepEqual(totais["sol-blocoA-101"], {
    consumo: 5,
    autoconsumo: 0,
    geracao: 7,
  });
  assert.deepEqual(totais["sol-blocoA-102"], {
    consumo: 1,
    autoconsumo: 0,
    geracao: 0,
  });
});
