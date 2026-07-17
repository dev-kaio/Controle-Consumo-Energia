const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;

// Inicializa o Firebase Admin (precisa vir antes de qualquer require de rota)
require("./config/firebaseAdmin");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const espSyncRoutes = require("./routes/espsync");
app.use(espSyncRoutes);

//Rotas Externas
const authRouter = require("./routes/auth");
app.use("/auth", authRouter);

const rotaDB = require("./routes/firebase");
app.use("/firebase", rotaDB);

const usuariosRoutes = require("./routes/usuarios");
app.use("/usuarios", usuariosRoutes);

const superadminRoutes = require("./routes/superadmin");
app.use("/superadmin", superadminRoutes);

const tarifasRoutes = require("./routes/tarifas");
app.use("/tarifas", tarifasRoutes);

const financeiroRoutes = require("./routes/financeiro");
app.use("/financeiro", financeiroRoutes);

const estruturaRoutes = require("./routes/estrutura");
app.use("/estrutura", estruturaRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.clear();
  console.log(`Servidor rodando em http://localhost:${port}`);
});
