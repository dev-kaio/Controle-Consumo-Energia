// Visão global do superadmin — rotas /superadmin/* do backend.
import { apiGet } from "./http.js";

export async function listarTodosUsuarios() {
  const { usuarios } = await apiGet("/superadmin/usuarios");
  return usuarios || {};
}

export async function listarTodosCondominios() {
  const { condominios } = await apiGet("/superadmin/condominios");
  return condominios || {};
}
