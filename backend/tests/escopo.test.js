// Controle de acesso por papel: quem enxerga qual apartamento.
//
// Arquivo separado dos utils porque isto é regra de SEGURANÇA — se um destes
// testes cair, alguém está vendo consumo alheio (ver docs/SEGURANCA.md).
// Rodar com: npm test
const { test } = require("node:test");
const assert = require("node:assert");

const { resolverAptosAlvo, listarAptosVisiveis } = require("../utils/escopoUtils");

// db falso: só o que as funções usam — ref(caminho).once("value").val()
function dbFake(apartamentos) {
  return {
    ref: (caminho) => ({
      once: async () => ({
        val: () => {
          if (caminho === "apartamentos") return apartamentos;
          // ref("apartamentos/sol-blocoA-101")
          const id = caminho.replace("apartamentos/", "");
          return apartamentos?.[id] ?? null;
        },
      }),
    }),
  };
}

const APARTAMENTOS = {
  "sol-blocoA-101": { condominioID: "sol", predioID: "blocoA", numero: "101" },
  "sol-blocoA-102": { condominioID: "sol", predioID: "blocoA", numero: "102" },
  "lua-blocoB-201": { condominioID: "lua", predioID: "blocoB", numero: "201" },
};

const db = dbFake(APARTAMENTOS);

const INQUILINO = {
  role: "inquilino",
  condominioID: "sol",
  apartamentoId: "sol-blocoA-101",
};
const ADMIN_SOL = { role: "admin", condominioID: "sol" };
const SUPERADMIN = { role: "superadmin" };

// ---------- inquilino ----------

test("inquilino sem pedir nada recebe só o próprio apartamento", async () => {
  const r = await resolverAptosAlvo(db, INQUILINO, null);
  assert.deepStrictEqual(r.aptos, ["sol-blocoA-101"]);
});

test("inquilino pedindo o próprio apartamento é aceito", async () => {
  const r = await resolverAptosAlvo(db, INQUILINO, "sol-blocoA-101");
  assert.deepStrictEqual(r.aptos, ["sol-blocoA-101"]);
});

test("inquilino NÃO vê apartamento do vizinho", async () => {
  const r = await resolverAptosAlvo(db, INQUILINO, "sol-blocoA-102");
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.aptos, undefined, "não pode vazar lista nenhuma");
});

test("inquilino sem apartamento nas claims é barrado", async () => {
  const semApto = { role: "inquilino", condominioID: "sol" };
  const r = await resolverAptosAlvo(db, semApto, null);
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.aptos, undefined);
});

// ---------- admin ----------

test("admin sem pedir nada recebe só os aptos do condomínio dele", async () => {
  const r = await resolverAptosAlvo(db, ADMIN_SOL, null);
  assert.deepStrictEqual(r.aptos.sort(), ["sol-blocoA-101", "sol-blocoA-102"]);
});

test("admin pedindo apto do próprio condomínio é aceito", async () => {
  const r = await resolverAptosAlvo(db, ADMIN_SOL, "sol-blocoA-102");
  assert.deepStrictEqual(r.aptos, ["sol-blocoA-102"]);
});

test("admin NÃO vê apartamento de outro condomínio", async () => {
  const r = await resolverAptosAlvo(db, ADMIN_SOL, "lua-blocoB-201");
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.aptos, undefined);
});

test("admin pedindo apartamento inexistente é barrado", async () => {
  const r = await resolverAptosAlvo(db, ADMIN_SOL, "sol-blocoA-999");
  assert.strictEqual(r.status, 403);
});

// ---------- superadmin ----------

test("superadmin sem pedir nada recebe todos os apartamentos", async () => {
  const r = await resolverAptosAlvo(db, SUPERADMIN, null);
  assert.strictEqual(r.aptos.length, 3);
});

test("superadmin alcança apartamento de qualquer condomínio", async () => {
  const r = await resolverAptosAlvo(db, SUPERADMIN, "lua-blocoB-201");
  assert.deepStrictEqual(r.aptos, ["lua-blocoB-201"]);
});

// ---------- listarAptosVisiveis ----------

test("banco vazio não quebra e devolve lista vazia", async () => {
  const r = await resolverAptosAlvo(dbFake(null), SUPERADMIN, null);
  assert.deepStrictEqual(r.aptos, []);
});

test("admin de condomínio sem apartamentos recebe lista vazia", async () => {
  const vazio = await listarAptosVisiveis(db, {
    role: "admin",
    condominioID: "inexistente",
  });
  assert.deepStrictEqual(vazio, []);
});
