/**
 * Helpers de competência/partição mensal ("AAAA-MM").
 *
 * As leituras são gravadas em leituras/{aptoID}/{tipo}/{AAAA-MM}/{pushId}.
 * Particionar por mês evita o problema de escala de baixar o histórico
 * inteiro para responder qualquer consulta: quem busca "julho" lê só o nó
 * de julho. Sempre em UTC, o mesmo fuso do timestamp gravado pela ESP.
 */

function mesDaData(data) {
  const d = data instanceof Date ? data : new Date(data);
  if (isNaN(d)) return null;
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

// Lista as competências entre duas datas, inclusive nas pontas.
// Ex: (2026-05-20, 2026-07-03) -> ["2026-05", "2026-06", "2026-07"]
function mesesNoIntervalo(inicio, fim) {
  const meses = [];
  const cursor = new Date(
    Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1),
  );
  const limite = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));

  while (cursor <= limite) {
    meses.push(mesDaData(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return meses;
}

// Competência anterior: "2026-01" -> "2025-12"
function mesAnterior(competencia) {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 2, 1));
  return mesDaData(d);
}

module.exports = { mesDaData, mesesNoIntervalo, mesAnterior };
