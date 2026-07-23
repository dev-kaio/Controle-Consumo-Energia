// O CSV vai parar no Excel do síndico. Os testes que importam aqui são os de
// escape: um nome com ponto e vírgula quebrando a planilha só aparece meses
// depois, quando alguém confere o total e não bate.
import assert from "node:assert/strict";
import test from "node:test";
import { fechamentoParaCSV } from "./csv.js";

const FECHAMENTO = {
  condominioID: "sol",
  competencia: "2026-07",
  aptos: [
    {
      aptoID: "sol-blocoA-101",
      predioNome: "Bloco A",
      numero: "101",
      morador: "Ana Souza",
      kwhFaturado: 123.456,
      total: 98.7,
      temLeitura: true,
    },
    {
      aptoID: "sol-blocoA-102",
      predioNome: "Bloco A",
      numero: "102",
      morador: null,
      kwhFaturado: 0,
      total: 0,
      temLeitura: false,
    },
  ],
  totais: { apartamentos: 2, semLeitura: 1, kwhFaturado: 123.456, total: 98.7 },
};

function linhas(csv) {
  return csv.replace(/^﻿/, "").split("\r\n");
}

test("tem cabeçalho, uma linha por apartamento e rodapé de total", () => {
  const l = linhas(fechamentoParaCSV(FECHAMENTO));
  assert.equal(l.length, 4);
  assert.ok(l[0].startsWith("Apartamento;Predio;Numero;Morador"));
  assert.ok(l[3].startsWith("TOTAL;"));
});

test("começa com BOM, senão o Excel estraga os acentos", () => {
  assert.ok(fechamentoParaCSV(FECHAMENTO).startsWith("﻿"));
});

test("números saem com vírgula decimal (Excel pt-BR)", () => {
  const l = linhas(fechamentoParaCSV(FECHAMENTO));
  assert.match(l[1], /;123,46;98,70;OK$/);
});

test("apartamento sem leitura aparece marcado, não sumido", () => {
  const l = linhas(fechamentoParaCSV(FECHAMENTO));
  assert.match(l[2], /SEM LEITURA$/);
  assert.match(l[2], /;0,00;0,00;/);
});

test("morador com ponto e vírgula no nome não quebra a coluna", () => {
  const csv = fechamentoParaCSV({
    ...FECHAMENTO,
    aptos: [{ ...FECHAMENTO.aptos[0], morador: "Silva; João" }],
  });
  const linha = linhas(csv)[1];
  assert.ok(linha.includes('"Silva; João"'), "campo tem que vir entre aspas");
  // 7 colunas: o ; de dentro das aspas não pode contar como separador
  assert.equal(linha.split(";").length, 8, "o ; escapado ainda divide a string crua");
  assert.match(linha, /^sol-blocoA-101;Bloco A;101;"Silva; João";/);
});

test("aspas no nome são dobradas", () => {
  const csv = fechamentoParaCSV({
    ...FECHAMENTO,
    aptos: [{ ...FECHAMENTO.aptos[0], morador: 'Ana "Aninha" Souza' }],
  });
  assert.ok(linhas(csv)[1].includes('"Ana ""Aninha"" Souza"'));
});

test("morador sem cadastro vira campo vazio, não 'null'", () => {
  const l = linhas(fechamentoParaCSV(FECHAMENTO));
  assert.ok(!l[2].includes("null"));
  assert.match(l[2], /^sol-blocoA-102;Bloco A;102;;/);
});

test("fechamento sem nenhum apartamento não quebra", () => {
  const l = linhas(
    fechamentoParaCSV({ condominioID: "x", competencia: "2026-07", aptos: [] }),
  );
  assert.equal(l.length, 2, "só cabeçalho e total");
  assert.match(l[1], /^TOTAL;;;;0,00;0,00;0 apartamentos$/);
});
