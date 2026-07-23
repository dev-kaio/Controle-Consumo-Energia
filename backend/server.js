const express = require("express");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;

// Inicializa o Firebase Admin (precisa vir antes de qualquer require de rota)
require("./config/firebaseAdmin");

app.use(express.json());

// Serve o BUILD do frontend React (frontend/dist — gerado por
// `npm run build` lá). Em dev normalmente se usa o servidor do Vite
// (frontend: npm run dev, porta 5173, com proxy pra cá).
// Quando os projetos virarem repos separados, essas linhas saem e o
// frontend passa a ser servido por conta própria (aí entra CORS aqui).
const FRONTEND_DIR = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(FRONTEND_DIR));

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

// Fallback do SPA: qualquer GET que não casou com API nem arquivo
// estático devolve o index.html — o React Router resolve a rota no
// navegador (é o que faz F5 em /dashboard funcionar).
// PRECISA ser o último middleware; e no Express 5 é app.use, não
// app.get("*") (o path-to-regexp v8 rejeita "*").
app.use((req, res, next) => {
  if (req.method !== "GET") return next(); // POST desconhecido → 404 normal
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(port, () => {
  console.clear();
  console.log(`Servidor rodando em http://localhost:${port}`);
});
