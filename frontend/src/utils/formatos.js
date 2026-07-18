// Formatação pt-BR — SÓ na hora de exibir (a agregação trabalha com
// timestamps numéricos; ver agregacao.js).

// Rótulo do eixo X conforme o agrupamento.
export function rotuloDoPeriodo(chaveMs, agrupamento) {
  const d = new Date(chaveMs);
  switch (agrupamento) {
    case "ano":
      return String(d.getFullYear());
    case "mes":
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    case "dia":
      return d.toLocaleDateString("pt-BR");
    default: // ponto a ponto: "05/03 14:32"
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}

export function formatarKWh(valor) {
  return `${Number(valor).toFixed(2)} kWh`;
}

// Nome amigável de cada filtro + agrupamento usado (mesma tabela do
// dashboard antigo).
export const FILTROS = {
  hora: { nome: "Última Hora", agrupamento: "hora" },
  dia: { nome: "Hoje", agrupamento: "hora" },
  semana: { nome: "Última Semana", agrupamento: "dia" },
  mes: { nome: "Último Mês", agrupamento: "dia" },
  ano: { nome: "Último Ano", agrupamento: "mes" },
  inicio: { nome: "Desde o Início", agrupamento: "ano" },
};

// ID composto "sol-blocoA-101" → "blocoA-101" (o condomínio é óbvio
// pro admin logado; o prédio não, se houver mais de um).
export function aptoSemCondominio(aptoID) {
  return (aptoID || "—").split("-").slice(1).join("-") || aptoID || "—";
}
