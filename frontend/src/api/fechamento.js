// Fechamento de competência — GET /financeiro/fechamento.
//
// É a conta de TODOS os apartamentos do condomínio num mês. Operação cara
// (2 leituras do Firebase por apartamento), por isso a tela só chama quando o
// usuário aperta "Gerar" — nunca sozinha ao abrir.
//
// Relatório recalculado: nada é gravado. Rodar de novo depois de corrigir uma
// tarifa dá números diferentes — de propósito, foi a decisão de projeto.
// O CSV é montado em utils/csv.js.
import { apiGet } from "./http.js";

export function buscarFechamento(condominioID, competencia, signal) {
  const params = { competencia };
  // Admin não precisa mandar: o backend usa o condomínio do token dele
  // (e ignora este parâmetro de qualquer forma).
  if (condominioID) params.condominioID = condominioID;
  const query = new URLSearchParams(params).toString();
  return apiGet(`/financeiro/fechamento?${query}`, { signal });
}
