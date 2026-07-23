// O logout limpa o localStorage — estes testes garantem que ele NÃO leve
// junto as preferências do aparelho (bug: o tutorial voltava a cada login).
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  CHAVE_TEMA,
  CHAVE_TOUR,
  limparSessaoPreservandoPreferencias,
} from "./preferencias.js";

// localStorage de mentira, suficiente pra função sob teste
function fingirStorage(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  globalThis.localStorage = {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    clear: () => dados.clear(),
  };
  return dados;
}

beforeEach(() => fingirStorage());

test("preserva tema e tutorial-visto no logout", () => {
  const dados = fingirStorage({ [CHAVE_TEMA]: "dark", [CHAVE_TOUR]: "1" });
  limparSessaoPreservandoPreferencias();
  assert.equal(dados.get(CHAVE_TEMA), "dark");
  assert.equal(dados.get(CHAVE_TOUR), "1");
});

test("apaga qualquer outra coisa que tenha ido parar no storage", () => {
  const dados = fingirStorage({
    [CHAVE_TEMA]: "light",
    perfil: '{"tipo":"superadmin"}',
    token: "abc123",
  });
  limparSessaoPreservandoPreferencias();
  assert.equal(dados.get(CHAVE_TEMA), "light");
  assert.equal(dados.has("perfil"), false);
  assert.equal(dados.has("token"), false);
});

test("não inventa chave que não existia", () => {
  const dados = fingirStorage({ [CHAVE_TEMA]: "dark" });
  limparSessaoPreservandoPreferencias();
  assert.equal(dados.has(CHAVE_TOUR), false, "tutorial não visto continua não visto");
  assert.equal(dados.size, 1);
});

test("storage bloqueado pelo navegador não derruba o logout", () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error("storage bloqueado");
    },
    setItem() {},
    clear() {},
  };
  assert.doesNotThrow(() => limparSessaoPreservandoPreferencias());
});
