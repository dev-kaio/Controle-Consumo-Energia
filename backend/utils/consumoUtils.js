/**
 * Calcula quantos kWh devem ser faturados a partir de uma lista de leituras
 * cumulativas (valorKWh sobe ao longo do tempo, nunca é "consumo do instante").
 *
 * Por que isso existe: a ESP32 acumula energiaKwh em RAM e nunca zera sozinha,
 * exceto quando reinicia (queda de energia, queda de wifi, atualização de
 * firmware). Se a gente simplesmente fizer "última leitura menos primeira",
 * um reinício no meio do período faz o valor cair (ex: de 45.3 pra 0.8) e o
 * cálculo dá errado — às vezes até negativo.
 *
 * A solução: somar os deltas entre leituras consecutivas. Quando o delta é
 * negativo (a leitura caiu), assume-se que houve um reinício e a leitura
 * atual já representa o consumo acumulado desde esse reinício (partindo de
 * perto de zero) — então soma-se o valor dela inteiro, em vez do delta.
 *
 * @param {Array<{timestamp: Date, valorKWh: number}>} leituras - já ordenadas
 *   por timestamp crescente. Idealmente inclui uma leitura anterior ao início
 *   do período como "baseline" (ponto de partida), seguida das leituras
 *   dentro do período.
 * @returns {number} kWh faturado no período (sempre >= 0)
 */
function calcularKwhFaturado(leituras) {
  if (!Array.isArray(leituras) || leituras.length < 2) {
    return 0;
  }

  let total = 0;

  for (let i = 1; i < leituras.length; i++) {
    const anterior = leituras[i - 1].valorKWh;
    const atual = leituras[i].valorKWh;
    const delta = atual - anterior;

    if (delta >= 0) {
      total += delta;
    } else {
      // Reinício detectado: valorKWh caiu. A leitura atual já é o
      // acumulado desde o reinício, então ela inteira é o consumo
      // desse trecho (não o delta, que seria negativo).
      total += atual;
    }
  }

  return total;
}

module.exports = { calcularKwhFaturado };