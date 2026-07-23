// Agregação das leituras de energia — FUNÇÕES PURAS, sem React/DOM.
// São testadas em agregacao.test.js (npm test).
//
// Princípio central: agrupar e ordenar por NÚMERO (timestamp em ms),
// nunca por texto formatado. O app antigo agrupava por strings tipo
// "05/03/2025" e depois re-parseava pra ordenar — frágil e cheio de
// casos especiais. Aqui a chave de um grupo é o timestamp do INÍCIO
// do período (hora/dia/mês/ano truncado); formatar em pt-BR é papel
// do formatos.js, só na hora de exibir.

// Trunca um timestamp pro início do período do agrupamento.
// Para "raw"/"hora" cada leitura é um ponto próprio (sem bucket) —
// mesmo comportamento do dashboard antigo, que plotava ponto a ponto
// nos filtros "Última Hora" e "Hoje".
export function chaveDoPeriodo(timestampMs, agrupamento) {
  const d = new Date(timestampMs);
  switch (agrupamento) {
    case "ano":
      return new Date(d.getFullYear(), 0, 1).getTime();
    case "mes":
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    case "dia":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    default: // "hora" e "raw": ponto a ponto
      return d.getTime();
  }
}

// Leituras [{timestamp, valorKWh}] → Map<chaveMs, somaKWh do período>
export function agruparPorPeriodo(itens, agrupamento) {
  const grupos = new Map();
  for (const item of itens) {
    const ts = new Date(item.timestamp).getTime();
    if (Number.isNaN(ts)) continue; // leitura corrompida não derruba o gráfico
    const chave = chaveDoPeriodo(ts, agrupamento);
    const valor = Number(item.valorKWh || 0);
    grupos.set(chave, (grupos.get(chave) || 0) + valor);
  }
  return grupos;
}

// Alinha as séries num eixo comum: união de todas as chaves, ordenada
// por número (= ordem temporal de graça), preenchendo 0 onde um tipo
// não tem leitura naquele período.
// mapas = { consumo: Map, autoconsumo: Map, geracao: Map }
export function alinharSeries(mapas) {
  const todasChaves = new Set();
  for (const mapa of Object.values(mapas)) {
    for (const chave of mapa.keys()) todasChaves.add(chave);
  }
  const chaves = [...todasChaves].sort((a, b) => a - b);

  const series = {};
  for (const [tipo, mapa] of Object.entries(mapas)) {
    series[tipo] = chaves.map((chave) => mapa.get(chave) || 0);
  }
  return { chaves, series };
}

// Média SÓ dos períodos com leitura (> 0) — um dia sem dado não conta
// como zero. Atenção: isso pode superestimar se o medidor ficou offline
// (decisão herdada do app antigo; ver docs/TARIFAS-FINANCEIRO.md).
export function calcularMedia(valores) {
  const validos = valores.filter((v) => v > 0);
  if (validos.length === 0) return 0;
  const soma = validos.reduce((acc, v) => acc + v, 0);
  return soma / validos.length;
}

// Pro intervalo custom: escolhe o agrupamento pelo tamanho do período.
// Mesmos cortes do app antigo.
export function agrupamentoAutomatico(inicio, fim) {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  const diffDias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (diffDias >= 730) return "ano";
  if (diffDias >= 60) return "mes";
  if (diffDias >= 2) return "dia";
  if (diffDias >= 0) return "hora";
  return "raw";
}

// Barras pra períodos agregados, linha pra séries ponto a ponto.
export function deveUsarBarras(filtro, agrupamento) {
  if (filtro && ["semana", "mes", "ano", "inicio"].includes(filtro)) return true;
  if (agrupamento && ["dia", "mes", "ano"].includes(agrupamento)) return true;
  return false;
}

// Soma consumo/autoconsumo/geração por apartamento (cards de inquilino).
// dadosPorTipo = { consumo: [{aptoID, valorKWh}...], ... }
export function totaisPorApartamento(dadosPorTipo) {
  const resultado = {};
  for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
    for (const item of dadosPorTipo[tipo] || []) {
      if (!item.aptoID) continue;
      if (!resultado[item.aptoID]) {
        resultado[item.aptoID] = { consumo: 0, autoconsumo: 0, geracao: 0 };
      }
      resultado[item.aptoID][tipo] += Number(item.valorKWh || 0);
    }
  }
  return resultado;
}
