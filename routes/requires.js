const admin = require("firebase-admin");

/**
 * Autentica o token Firebase
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // role, predioId, uid...
    next();
  } catch (err) {
    console.error("Token inválido:", err);
    res.status(403).json({ error: "Token inválido" });
  }
}

/**
 * Restringe por role (RBAC)
 * Ex: requireRole("dono", "superadmin")
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

/**
 * Garante que o recurso pertence ao mesmo prédio
 * Superadmin ignora escopo
 */
async function requireMesmoPredio(req, res, next) {
  try {
    if (req.user.role === "superadmin") {
      return next();
    }

    const predioId = req.user.predioId;
    const db = admin.database();

    // valida por UID de inquilino
    if (req.body?.uid) {
      const snap = await db.ref(`Usuarios/${req.body.uid}`).once("value");

      if (!snap.exists()) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (snap.val().predioId !== predioId) {
        return res.status(403).json({ error: "Usuário fora do seu prédio" });
      }
    }

    // valida por apartamento
    if (req.body?.apartamento) {
      const snap = await db
        .ref(`Apartamentos/${req.body.apartamento}`)
        .once("value");

      if (!snap.exists()) {
        return res.status(404).json({ error: "Apartamento não encontrado" });
      }

      if (snap.val().predioId !== predioId) {
        return res
          .status(403)
          .json({ error: "Apartamento fora do seu prédio" });
      }
    }

    next();
  } catch (err) {
    console.error("Erro requireMesmoPredio:", err);
    res.status(500).json({ error: "Erro de autorização" });
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireMesmoPredio,
};
