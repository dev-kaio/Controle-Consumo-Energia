/**
 * Vincula uma conta JÁ EXISTENTE no Firebase Auth ao banco (usuarios/{uid}).
 *
 * Útil quando o Auth tem a conta mas o banco não (ex: depois de rodar o
 * seed, que recria o nó usuarios/ só com os usuários de teste).
 *
 * Uso:
 *   node scripts/vincular-usuario.js <email> superadmin
 *   node scripts/vincular-usuario.js <email> admin <condominioID>
 *   node scripts/vincular-usuario.js <email> inquilino <aptoID>
 *
 * Ex:
 *   node scripts/vincular-usuario.js kaio@exemplo.com superadmin
 *   node scripts/vincular-usuario.js sindico@exemplo.com admin sol
 *   node scripts/vincular-usuario.js morador@exemplo.com inquilino sol-blocoA-201
 */
const admin = require("../config/firebaseAdmin");
const { validarAptoId, validarSegmento } = require("../utils/idUtils");

const db = admin.database();

async function main() {
  const [email, tipo, extra] = process.argv.slice(2);

  if (!email || !["superadmin", "admin", "inquilino"].includes(tipo)) {
    console.log("Uso: node scripts/vincular-usuario.js <email> <superadmin|admin|inquilino> [condominioID|aptoID]");
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(`Nenhuma conta no Firebase Auth com o email ${email}`);
    process.exit(1);
  }

  const registro = {
    nome: user.displayName || email.split("@")[0],
    email,
    tipo,
    ativo: true,
  };

  if (tipo === "admin") {
    if (!validarSegmento(extra)) {
      console.error("Admin precisa de um condominioID válido (ex: sol)");
      process.exit(1);
    }
    const condo = await db.ref(`condominios/${extra}`).once("value");
    if (!condo.exists()) {
      console.error(`Condomínio "${extra}" não existe no banco`);
      process.exit(1);
    }
    registro.condominioID = extra;
  }

  if (tipo === "inquilino") {
    if (!validarAptoId(extra)) {
      console.error("Inquilino precisa de um aptoID válido (ex: sol-blocoA-101)");
      process.exit(1);
    }
    const aptoSnap = await db.ref(`apartamentos/${extra}`).once("value");
    const apto = aptoSnap.val();
    if (!apto) {
      console.error(`Apartamento "${extra}" não existe no banco`);
      process.exit(1);
    }
    registro.aptoID = extra;
    registro.condominioID = apto.condominioID;
  }

  await db.ref(`usuarios/${user.uid}`).set(registro);

  // Zera claims antigas — o login (/auth/role) define as novas na hora
  await admin.auth().setCustomUserClaims(user.uid, null);

  console.log(`Vinculado: ${email} → ${tipo}${extra ? ` (${extra})` : ""}`);
  console.log("Claims antigas zeradas — basta logar de novo que o backend define as novas.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
