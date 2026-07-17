/**
 * Service worker do Palm Energy.
 *
 * Estratégia (pensada pra app com dado sensível e sempre-fresco):
 * - API (/auth, /firebase, /usuarios, ...): NUNCA passa pelo cache.
 *   Dado de consumo/financeiro/usuário tem que vir sempre do servidor.
 * - Navegação (HTML): rede primeiro; se offline, tenta o cache e por
 *   último a página offline.html.
 * - Estáticos (css/js/imagens/fontes/CDN): stale-while-revalidate —
 *   responde do cache na hora e atualiza em segundo plano.
 *
 * Pra forçar atualização geral nos clientes: subir a versão do CACHE.
 */
const CACHE = "palm-energy-v1";

const PRECACHE = [
  "/",
  "/offline.html",
  "/css/variables.css",
  "/css/style.css",
  "/css/menu.css",
  "/assets/favicon.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

// Prefixos de API — o service worker não intercepta nada disso
const PREFIXOS_API = [
  "/auth",
  "/firebase",
  "/usuarios",
  "/superadmin",
  "/tarifas",
  "/financeiro",
  "/estrutura",
  "/esp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API: sempre rede, sem cache (dados sensíveis e sempre-frescos)
  if (
    url.origin === self.location.origin &&
    PREFIXOS_API.some((p) => url.pathname.startsWith(p))
  ) {
    return;
  }

  // Navegação (abrir/recarregar página): rede primeiro
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(async () => {
          const emCache = await caches.match(req);
          return emCache || caches.match("/offline.html");
        }),
    );
    return;
  }

  // Estáticos (mesma origem ou CDN de fontes/Chart.js):
  // cache primeiro, atualiza em segundo plano
  event.respondWith(
    caches.match(req).then((emCache) => {
      const daRede = fetch(req)
        .then((resp) => {
          if (resp.ok || resp.type === "opaque") {
            const copia = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copia));
          }
          return resp;
        })
        .catch(() => emCache);
      return emCache || daRede;
    }),
  );
});
