// Formatação que o card de potência e a fatura usam. Lógica pura.
import assert from "node:assert/strict";
import test from "node:test";
import {
  formatarPotencia,
  formatarReais,
  idadeRelativa,
  aptoSemCondominio,
} from "./formatos.js";

// ---------- potência ----------

test("potência abaixo de 1 kW fica em watts inteiros", () => {
  assert.equal(formatarPotencia(347.2), "347 W");
  assert.equal(formatarPotencia(0), "0 W");
  assert.equal(formatarPotencia(999.6), "1000 W");
});

test("potência de 1 kW pra cima vira kW com vírgula decimal", () => {
  assert.equal(formatarPotencia(1000), "1,00 kW");
  assert.equal(formatarPotencia(1240), "1,24 kW");
  assert.equal(formatarPotencia(5500), "5,50 kW");
});

test("potência ausente não vira 'NaN W' na cara do usuário", () => {
  assert.equal(formatarPotencia(null), "—");
  assert.equal(formatarPotencia(undefined), "—");
  assert.equal(formatarPotencia("abc"), "—");
});

// ---------- idade da leitura ----------

const AGORA = new Date("2026-07-22T12:00:00Z").getTime();
const atras = (ms) => new Date(AGORA - ms).toISOString();

test("idade em segundos, minutos, horas e dias", () => {
  assert.equal(idadeRelativa(atras(40 * 1000), AGORA), "há 40 s");
  assert.equal(idadeRelativa(atras(3 * 60 * 1000), AGORA), "há 3 min");
  assert.equal(idadeRelativa(atras(2 * 60 * 60 * 1000), AGORA), "há 2 h");
  assert.equal(idadeRelativa(atras(3 * 24 * 60 * 60 * 1000), AGORA), "há 3 dias");
});

test("um dia é singular", () => {
  assert.equal(idadeRelativa(atras(25 * 60 * 60 * 1000), AGORA), "há 1 dia");
});

test("leitura recém-chegada não vira 'há 0 s'", () => {
  assert.equal(idadeRelativa(atras(2 * 1000), AGORA), "agora");
});

test("relógio da ESP adiantado não produz idade negativa", () => {
  const futuro = new Date(AGORA + 30 * 1000).toISOString();
  assert.equal(idadeRelativa(futuro, AGORA), "agora");
});

test("sem timestamp devolve null pra quem chama decidir o texto", () => {
  assert.equal(idadeRelativa(null, AGORA), null);
  assert.equal(idadeRelativa("data podre", AGORA), null);
});

// ---------- reais ----------

test("valor em reais sai no formato brasileiro", () => {
  // espaço não-quebrável entre "R$" e o número é como o Intl gera em pt-BR
  assert.match(formatarReais(1234.5), /^R\$\s1\.234,50$/);
  assert.match(formatarReais(0), /^R\$\s0,00$/);
  assert.match(formatarReais(null), /^R\$\s0,00$/);
});

// ---------- id de apartamento ----------

test("id composto perde o condomínio mas mantém o prédio", () => {
  assert.equal(aptoSemCondominio("sol-blocoA-101"), "blocoA-101");
  assert.equal(aptoSemCondominio(null), "—");
});
