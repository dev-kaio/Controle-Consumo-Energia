/**
 * Quais apartamentos um usuário pode ver.
 *
 * Estava embutido no handler de /firebase/consumo. Virou util quando a rota
 * de última leitura passou a precisar da MESMA decisão: duas cópias de regra
 * de acesso é como se reintroduz um bug de escopo sem ninguém perceber
 * (ver docs/SEGURANCA.md). Recebe `db` por parâmetro pra dar pra testar sem
 * Firebase, no mesmo padrão de tarifaUtils.js.
 */

/**
 * IDs de apartamento visíveis quando NÃO se pediu um específico.
 * - superadmin: todos do sistema
 * - admin: só os do próprio condomínio
 */
async function listarAptosVisiveis(db, usuario) {
  const snapshot = await db.ref("apartamentos").once("value");
  const apartamentos = snapshot.val() || {};

  return Object.entries(apartamentos)
    .filter(([, apto]) => {
      if (usuario.role === "superadmin") return true;
      return apto.condominioID === usuario.condominioID;
    })
    .map(([aptoID]) => aptoID);
}

/**
 * Resolve o alvo de uma consulta de leituras.
 *
 * @returns {Promise<{aptos: string[]} | {status: number, erro: string}>}
 *   Sucesso traz `aptos`; negativa traz `status` + `erro` prontos pro res.
 *   Quem chama TEM que testar `resultado.erro` antes de usar `resultado.aptos`.
 */
async function resolverAptosAlvo(db, usuario, aptoQuery) {
  const { role, condominioID } = usuario;
  const aptoToken = usuario.apartamentoId || null;

  // Inquilino só vê o próprio apartamento, sempre.
  if (role === "inquilino") {
    if (!aptoToken) {
      return { status: 403, erro: "Usuário sem apartamento vinculado" };
    }
    if (aptoQuery && aptoQuery !== aptoToken) {
      return { status: 403, erro: "Acesso negado" };
    }
    return { aptos: [aptoToken] };
  }

  // Gestor pediu um apartamento específico: admin precisa que seja do
  // condomínio dele; superadmin passa direto.
  if (aptoQuery) {
    if (role !== "superadmin") {
      const aptoSnap = await db.ref(`apartamentos/${aptoQuery}`).once("value");
      const aptoData = aptoSnap.val();
      if (!aptoData || aptoData.condominioID !== condominioID) {
        return { status: 403, erro: "Acesso negado" };
      }
    }
    return { aptos: [aptoQuery] };
  }

  // Sem apartamento na query: devolve tudo que o papel alcança.
  return { aptos: await listarAptosVisiveis(db, usuario) };
}

module.exports = { listarAptosVisiveis, resolverAptosAlvo };
