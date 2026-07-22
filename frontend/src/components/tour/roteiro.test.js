// Testa o filtro por papel do roteiro do tour — lógica pura, sem React.
import assert from "node:assert/strict";
import test from "node:test";
import { roteiroDoPapel } from "./roteiro.js";

const ROTAS_DE_GESTOR = ["/inquilinos", "/estrutura", "/superadmin"];

test("inquilino não vê nenhum passo de tela restrita", () => {
  const passos = roteiroDoPapel("inquilino");
  assert.ok(passos.length > 0);
  for (const p of passos) {
    assert.ok(
      !ROTAS_DE_GESTOR.includes(p.rota),
      `inquilino não deveria ver o passo "${p.id}" (${p.rota})`,
    );
  }
});

test("admin vê inquilinos e estrutura, mas não superadmin nem tarifas", () => {
  const ids = roteiroDoPapel("admin").map((p) => p.id);
  assert.ok(ids.includes("inquilinos-lista"));
  assert.ok(ids.includes("estrutura-predios"));
  assert.ok(!ids.includes("superadmin-usuarios"));
  // PainelTarifas só renderiza pra superadmin (pages/Estrutura.jsx:76)
  assert.ok(!ids.includes("estrutura-tarifas"));
});

test("superadmin vê o roteiro completo", () => {
  const ids = roteiroDoPapel("superadmin").map((p) => p.id);
  assert.ok(ids.includes("estrutura-tarifas"));
  assert.ok(ids.includes("superadmin-usuarios"));
});

test("cada papel começa em boas-vindas e termina no fim", () => {
  for (const papel of ["inquilino", "admin", "superadmin"]) {
    const passos = roteiroDoPapel(papel);
    assert.equal(passos[0].id, "boas-vindas", papel);
    assert.equal(passos.at(-1).id, "fim", papel);
  }
});

test("papel desconhecido (perfil ainda carregando) não quebra", () => {
  assert.deepEqual(roteiroDoPapel(undefined), []);
});

test("ids são únicos e todo passo tem título e texto", () => {
  const todos = roteiroDoPapel("superadmin");
  assert.equal(new Set(todos.map((p) => p.id)).size, todos.length);
  for (const p of todos) {
    assert.ok(p.titulo?.length, p.id);
    assert.ok(p.texto?.length, p.id);
  }
});
