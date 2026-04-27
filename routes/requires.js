const admin = require("firebase-admin");

/**
 * Autentica token Firebase
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

    // garante padrão
    req.user = {
      uid: decoded.uid,
      role: decoded.role,
      condominioID: decoded.condominioID,
      predioID: decoded.predioID,
      apartamentoID: decoded.aptoID,
    };

    next();
  } catch (err) {
    console.error("Token inválido:", err);
    res.status(403).json({ error: "Token inválido" });
  }
}

/**
 * RBAC
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};
