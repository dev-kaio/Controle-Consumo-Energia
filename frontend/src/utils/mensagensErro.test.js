// Uma asserção por camada da mensagemAmigavel, mais as pontas soltas.
// A regra que mais importa aqui é a última: NADA técnico pode escapar
// pra tela — na dúvida, frase genérica.
import assert from "node:assert/strict";
import test from "node:test";
import { mensagemAmigavel } from "./mensagensErro.js";

// Reproduz o Error que o api/http.js monta a partir da resposta do backend
function erroHttp(mensagem, status) {
  const err = new Error(mensagem);
  err.status = status;
  return err;
}

test("camada 1: código do Firebase Auth ganha de tudo", () => {
  const err = new Error("Firebase: Error (auth/invalid-credential).");
  err.code = "auth/invalid-credential";
  assert.equal(mensagemAmigavel(err), "E-mail ou senha incorretos.");
});

test("credencial errada não revela se o e-mail existe", () => {
  const codigos = [
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
  ];
  const frases = codigos.map((code) => mensagemAmigavel({ code }));
  assert.equal(new Set(frases).size, 1, "os três têm que dar a MESMA frase");
});

test("camada 2: falha de rede", () => {
  const err = new Error("Sem conexão");
  err.semRede = true;
  assert.match(mensagemAmigavel(err), /Sem conexão com a internet/);
});

test("camada 2 ganha do status (offline não é erro do servidor)", () => {
  const err = erroHttp("Sem conexão", 500);
  err.semRede = true;
  assert.match(mensagemAmigavel(err), /Sem conexão com a internet/);
});

test("camada 3: mensagem exata do backend vira português de gente", () => {
  assert.equal(
    mensagemAmigavel(
      erroHttp("condominioID, predioID e numero devem ter só letras e números", 400),
    ),
    "O número do apartamento só pode ter letras e números, sem espaço nem hífen. Ex: 101",
  );
});

test("camada 3 ganha do status genérico do mesmo erro", () => {
  const semTarifa = erroHttp(
    "Nenhuma tarifa cadastrada para o condomínio deste apartamento",
    404,
  );
  assert.match(mensagemAmigavel(semTarifa), /tarifa cadastrada para este mês/);
  assert.notEqual(mensagemAmigavel(semTarifa), "Não encontramos esse registro.");
});

test("camada 4: status conhecido sem mensagem no dicionário", () => {
  assert.equal(
    mensagemAmigavel(erroHttp("Nome esquisito que ninguém mapeou", 403)),
    "Você não tem permissão para isso.",
  );
});

test("camada 4: qualquer 5xx vira a mesma frase de sistema fora do ar", () => {
  // Todos os "Erro ao ..." do backend são 500 e de propósito NÃO estão no
  // dicionário — se aparecer um novo, ele já cai aqui sem ninguém mexer.
  for (const status of [500, 502, 503]) {
    assert.match(
      mensagemAmigavel(erroHttp("Erro ao criar dispositivo", status)),
      /sistema não conseguiu concluir/,
    );
  }
});

test("camada 5: erro desconhecido não vaza texto técnico", () => {
  const cru = new TypeError("Cannot read properties of undefined (reading 'val')");
  assert.equal(mensagemAmigavel(cru), "Não foi possível concluir. Tente de novo.");
});

test("erro nulo ou indefinido não quebra", () => {
  assert.equal(mensagemAmigavel(null), "Não foi possível concluir. Tente de novo.");
  assert.equal(mensagemAmigavel(undefined), "Não foi possível concluir. Tente de novo.");
});

test("toda frase entregue termina em pontuação e começa maiúscula", () => {
  const amostras = [
    { code: "auth/user-disabled" },
    { semRede: true },
    erroHttp("Acesso negado", 403),
    erroHttp("Filtro inválido", 400),
    erroHttp("Erro ao salvar", 500),
    null,
  ];
  for (const err of amostras) {
    const frase = mensagemAmigavel(err);
    assert.match(frase, /^[A-ZÀ-Ú]/, `"${frase}" deveria começar maiúscula`);
    assert.match(frase, /[.!]$/, `"${frase}" deveria terminar com ponto`);
  }
});
