// Inicialização única do Firebase Admin SDK a partir do .env.
// Usado pelo server.js e pelos scripts (ex: scripts/seed.js) — assim a
// configuração vive num lugar só.
require("dotenv").config();

const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    const firebaseConfig = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    };

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin SDK:", error);
    process.exit(1);
  }
}

module.exports = admin;
