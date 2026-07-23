import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    react(),

    // PWA: o plugin gera o service worker (Workbox) e o manifest no build.
    // Substitui o sw.js manual antigo — MESMA URL /sw.js, então clientes
    // com o app antigo instalado recebem o novo na próxima visita
    // (autoUpdate = skipWaiting + clientsClaim: assume na hora).
    VitePWA({
      registerType: "autoUpdate",
      // Estratégia igual à do sw.js antigo, só que por construção:
      // - shell + estáticos ficam no precache (com hash → nunca velhos)
      // - API NUNCA é cacheada (não casa com precache nem runtimeCaching)
      // - navegação offline cai no index.html precacheado
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
        // Prefixos de API jamais respondem com o shell do app
        navigateFallbackDenylist: [
          /^\/auth\//,
          /^\/firebase\//,
          /^\/usuarios\//,
          /^\/estrutura\//,
          /^\/superadmin\//,
          /^\/tarifas\//,
          /^\/financeiro\//,
          /^\/esp\//,
        ],
        runtimeCaching: [
          {
            // Fontes do Google: stale-while-revalidate (rápido + atualiza)
            urlPattern: ({ url }) =>
              ["fonts.googleapis.com", "fonts.gstatic.com"].includes(
                url.hostname,
              ),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fontes" },
          },
        ],
      },
      manifest: {
        name: "Palm Energy",
        short_name: "Palm Energy",
        description:
          "Controle de energia na palma da sua mão — monitoramento e faturamento por apartamento.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#6606eb",
        background_color: "#eef0f4",
        icons: [
          {
            src: "/assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/assets/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // SW desligado em dev — cache atrapalharia o hot reload
      devOptions: { enabled: false },
    }),
  ],
  server: { proxy },
  preview: { proxy },
});
