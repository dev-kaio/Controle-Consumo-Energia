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

// "2026-07" → "07/2026" (a competência é chave no banco, não texto de tela)
export function competenciaLegivel(competencia) {
  if (!/^\d{4}-\d{2}$/.test(competencia || "")) return competencia || "—";
  const [ano, mes] = competencia.split("-");
  return `${mes}/${ano}`;
}

export function formatarReais(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Potência instantânea da ESP, que chega sempre em watts. Vira kW a partir
// de 1000 porque "1,24 kW" se lê melhor que "1240 W" — abaixo disso o watt
// inteiro é mais honesto que "0,35 kW".
export function formatarPotencia(watts) {
  if (watts == null || Number.isNaN(Number(watts))) return "—";
  const w = Number(watts);
  if (Math.abs(w) < 1000) return `${Math.round(w)} W`;
  return `${(w / 1000).toFixed(2).replace(".", ",")} kW`;
}

// A ESP manda de minuto em minuto. Passou disto sem leitura nova, não é
// "consumo zero" — é medidor mudo, e o dashboard tem que dizer isso.
export const LEITURA_VELHA_MS = 10 * 60 * 1000;

// "há 40 s", "há 3 min", "há 2 h". `agora` entra por parâmetro pra dar
// pra testar sem depender do relógio.
export function idadeRelativa(timestamp, agora = Date.now()) {
  if (!timestamp) return null;
  const ms = agora - new Date(timestamp).getTime();
  if (Number.isNaN(ms)) return null;
  if (ms < 0) return "agora"; // relógio da ESP adiantado

  const segundos = Math.floor(ms / 1000);
  if (segundos < 10) return "agora";
  if (segundos < 60) return `há ${segundos} s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
