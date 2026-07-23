// Testa o filtro por papel do roteiro do tour — lógica pura, sem React.
import assert from "node:assert/strict";
import test from "node:test";
import { roteiroDoPapel } from "./roteiro.js";

// Toda rota que o RequireRole barra pra inquilino (ver App.jsx). Rota nova
// de gestor entra AQUI também, senão este teste vira decoração.
const ROTAS_DE_GESTOR = [
  "/inquilinos",
  "/estrutura",
  "/fechamento",
  "/superadmin",
];

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

test("admin vê inquilinos, estrutura e fechamento, mas não superadmin nem tarifas", () => {
  const ids = roteiroDoPapel("admin").map((p) => p.id);
  assert.ok(ids.includes("inquilinos-lista"));
  assert.ok(ids.includes("estrutura-predios"));
  assert.ok(ids.includes("fechamento"));
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

test("passo de tela com abas declara qual aba abrir", () => {
  // /estrutura renderiza SÓ a aba ativa (components/ui/Abas.jsx). Um passo
  // sem `aba` aponta pra um data-tour que não está no DOM, e o Tour.jsx pula
  // o passo em silêncio — o tutorial encolhe e ninguém percebe.
  const ROTAS_COM_ABAS = ["/estrutura"];
  for (const p of roteiroDoPapel("superadmin")) {
    if (ROTAS_COM_ABAS.includes(p.rota) && p.alvo) {
      assert.ok(p.aba, `passo "${p.id}" (${p.rota}) precisa declarar \`aba\``);
    }
  }
});

test("ids são únicos e todo passo tem título e texto", () => {
  const todos = roteiroDoPapel("superadmin");
  assert.equal(new Set(todos.map((p) => p.id)).size, todos.length);
  for (const p of todos) {
    assert.ok(p.titulo?.length, p.id);
    assert.ok(p.texto?.length, p.id);
  }
});
