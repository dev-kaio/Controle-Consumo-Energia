import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev o backend roda em :3000 e o Vite em :5173. O proxy repassa
// os fetches relativos (ex: fetch("/usuarios/listar")) pro backend —
// assim o código do app não precisa saber de URL nenhuma.
//
// REGRA: criou uma rota nova no backend com prefixo novo? Adiciona o
// prefixo aqui, senão "funciona em prod, quebra em dev".
const PREFIXOS_API = [
  "/auth",
  "/firebase",
  "/usuarios",
  "/estrutura",
  "/superadmin",
  "/tarifas",
  "/financeiro",
];

// Pegadinha: /estrutura e /superadmin são rota do SPA E prefixo de API.
// Navegação de navegador (abrir/F5 a página) pede "text/html" → devolve o
// index e o React Router resolve; fetch de API pede "*/*" → vai pro backend.
const proxy = Object.fromEntries(
  PREFIXOS_API.map((prefixo) => [
    prefixo,
    {
      target: "http://localhost:3000",
      bypass(req) {
        if (req.headers.accept?.includes("text/html")) return "/index.html";
      },
    },
  ]),
);

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
