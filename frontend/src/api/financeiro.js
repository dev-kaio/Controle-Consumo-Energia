// Conta de um apartamento numa competência — GET /financeiro.
// O backend calcula tudo (kWh faturado, TUSD, TE, IP-CIP, total) e já devolve
// os nomes de condomínio/prédio, porque o inquilino não tem acesso a
// /estrutura/apartamentos pra montar isso por conta própria.
import { apiGet } from "./http.js";

export function buscarFinanceiro(apartamentoId, competencia, signal) {
  const query = new URLSearchParams({ apartamentoId, competencia }).toString();
  return apiGet(`/financeiro?${query}`, { signal });
}

// Competência corrente em UTC — o backend particiona as leituras com
// mesDaData(), que também é UTC. Usar o mês local faria a virada do dia 1
// pedir um mês que ainda não existe no banco.
export function competenciaAtual() {
  return new Date().toISOString().slice(0, 7);
}
