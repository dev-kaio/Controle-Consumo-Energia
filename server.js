require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");

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
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin SDK:", error);
  process.exit(1);
}

const db = admin.database();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

//Rotas Externas
const rotaAuth = require("./routes/auth");
app.use("/auth", rotaAuth);

const rotaDB = require("./routes/firebase.js")
app.use("/firebase", rotaDB);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.clear();
  console.log(`Servidor rodando em http://localhost:${port}`);
});
