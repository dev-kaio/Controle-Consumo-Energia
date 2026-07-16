/**
 * Normaliza um identificador de apartamento para o padrão do banco:
 * sempre COM o prefixo "apto_" (ex: "202" -> "apto_202").
 *
 * Por que isso existe: o ID chega de fontes diferentes — a claim do token
 * (`aptoID`, já salva no banco com prefixo, ex: "apto_202") e a query string
 * do frontend (que às vezes manda só o número). Antes dessa função, o
 * backend concatenava "apto_" sem checar, gerando caminhos inválidos como
 * `leituras/apto_apto_202` — a consulta não dava erro, só voltava vazia.
 *
 * @param {string|undefined|null} id
 * @returns {string|null} ID normalizado, ou null se vazio/inválido
 */
function normalizarAptoId(id) {
  if (typeof id !== "string" || id.trim() === "") return null;
  const limpo = id.trim();
  return limpo.startsWith("apto_") ? limpo : `apto_${limpo}`;
}

module.exports = { normalizarAptoId };
