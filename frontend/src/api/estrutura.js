// Estrutura física (condomínio → prédio → apartamento → medidor) e
// tarifas — rotas /estrutura/* e /tarifas/* do backend.
// IDs de apartamento são compostos (sol-blocoA-101) e MONTADOS PELO
// BACKEND (utils/idUtils.js de lá) — o frontend nunca monta na mão.
import { apiGet, apiPost } from "./http.js";

export async function listarCondominios() {
  const { condominios } = await apiGet("/estrutura/condominios");
  return condominios || {};
}

export async function listarApartamentos(condominioID) {
  const query = condominioID
    ? `?condominioID=${encodeURIComponent(condominioID)}`
    : "";
  const { apartamentos } = await apiGet(`/estrutura/apartamentos${query}`);
  return apartamentos || {};
}

export async function listarDispositivos() {
  const { dispositivos } = await apiGet("/estrutura/dispositivos");
  return dispositivos || {};
}

export function criarCondominio(dados) {
  return apiPost("/estrutura/condominios", dados);
}

export function criarPredio(dados) {
  return apiPost("/estrutura/predios", dados);
}

export function criarApartamento(dados) {
  return apiPost("/estrutura/apartamentos", dados);
}

// Devolve { espId, chave } — a chave só existe nesta resposta!
export function criarDispositivo(dados) {
  return apiPost("/estrutura/dispositivos", dados);
}

export async function listarTarifas(condominioID) {
  const { tarifas } = await apiGet(
    `/tarifas/${encodeURIComponent(condominioID)}`,
  );
  return tarifas || {};
}

export function salvarTarifa(dados) {
  return apiPost("/tarifas", dados);
}
