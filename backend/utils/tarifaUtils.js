/**
 * Busca a tarifa vigente de um condomínio para uma competência (AAAA-MM).
 *
 * Se não existir tarifa cadastrada exatamente para essa competência, cai
 * para a competência mais recente ANTERIOR a ela. Isso evita obrigar o
 * superadmin a recadastrar a tarifa todo mês quando ela não muda — só
 * precisa cadastrar uma nova competência quando a distribuidora reajustar
 * os valores.
 *
 * O formato "AAAA-MM" foi escolhido de propósito: comparações de string
 * ("2026-01" < "2026-02") já funcionam como comparação cronológica, sem
 * precisar converter pra Date.
 *
 * @param {admin.database.Database} db
 * @param {string} condominioID
 * @param {string} competencia - formato "AAAA-MM"
 * @returns {Promise<null | {competencia: string, tusd: number, te: number, ipCip: object}>}
 *   `competencia` no retorno é a competência REAL aplicada (pode ser
 *   anterior à solicitada, se não houver uma exata).
 */
async function buscarTarifaVigente(db, condominioID, competencia) {
  const snapshot = await db.ref(`tarifas/${condominioID}`).once("value");
  const todasTarifas = snapshot.val();

  if (!todasTarifas) return null;

  if (todasTarifas[competencia]) {
    return { competencia, ...todasTarifas[competencia] };
  }

  const competenciasAnteriores = Object.keys(todasTarifas)
    .filter((c) => c < competencia)
    .sort();

  if (competenciasAnteriores.length === 0) return null;

  const maisRecente = competenciasAnteriores[competenciasAnteriores.length - 1];
  return { competencia: maisRecente, ...todasTarifas[maisRecente] };
}

module.exports = { buscarTarifaVigente };