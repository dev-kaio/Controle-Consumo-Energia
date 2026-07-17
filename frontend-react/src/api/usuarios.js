// Usuários/inquilinos — rotas /usuarios/* do backend.
// O backend filtra pelo condomínio do admin logado; o navegador nunca
// recebe dados de outros condomínios.
import { apiGet, apiPost } from "./http.js";

export async function listarInquilinos() {
  const { inquilinos } = await apiGet("/usuarios/listar");
  return inquilinos || {};
}

export function criarInquilino(dados) {
  return apiPost("/usuarios/criar", dados);
}

export function atualizarUsuario(uid, dados) {
  return apiPost("/usuarios/atualizar", { uid, dados });
}

export function deletarUsuario(uid) {
  return apiPost("/usuarios/deletar", { uid });
}
