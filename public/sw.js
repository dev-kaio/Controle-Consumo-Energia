/**
 * Service worker do Palm Energy.
 *
 * Estratégia (pensada pra app com dado sensível e sempre-fresco):
 * - Só entra no cache o que é COMPROVADAMENTE estático (allow-list por
 *   tipo/extensão + CDNs conhecidos). Tudo que não casa com a allow-list
 *   passa direto pra rede — uma rota de API nova jamais é cacheada por
 *   esquecimento (com deny-list, era o modo de falha padrão).
 * - Navegação (HTML): rede primeiro; só respostas 200 entram no cache
 *   (nunca uma página de erro); se offline, cache e por último offline.html.
 * - Estáticos: stale-while-revalidate — responde do cache na hora e
 *   atualiza em segundo plano (com waitUntil, senão o navegador mata o
 *   worker antes do cache.put e o asset fica velho pra sempre).
 *
 * Pra forçar atualização geral nos clientes: subir a versão do CACHE.
 */
const CACHE = "palm-energy-v2";

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

// Hosts externos cujos estáticos podem ser cacheados (fontes, Chart.js)
const CDNS_PERMITIDOS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "www.gstatic.com",
];

const EXTENSOES_ESTATICAS =
  /\.(css|js|mjs|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|json)$/;

// Um request só é cacheável se for inequivocamente um asset estático.
function ehEstatico(req, url) {
  if (url.origin === self.location.origin) {
    // manifest e assets por extensão; NUNCA caminhos de API (que não
    // têm extensão de arquivo — /auth/role, /firebase/consumo, ...)
    return EXTENSOES_ESTATICAS.test(url.pathname);
  }
  return CDNS_PERMITIDOS.includes(url.hostname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // allSettled: um asset renomeado/404 não pode impedir a instalação
        // da versão nova inteira do service worker
        Promise.allSettled(PRECACHE.map((item) => cache.add(item))),
      )
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

  // Navegação (abrir/recarregar página): rede primeiro
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // Só HTML saudável entra no cache — uma página de erro cacheada
          // seria servida no lugar da offline.html depois
          if (resp.ok) {
            const copia = resp.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(req, copia)),
            );
          }
          return resp;
        })
        .catch(async () => {
          const emCache = await caches.match(req);
          return emCache || caches.match("/offline.html");
        }),
    );
    return;
  }

  // Fora da allow-list de estáticos: rede direto, sem tocar no cache.
  // (APIs autenticadas caem aqui por construção — sem lista pra manter.)
  if (!ehEstatico(req, url)) return;

  // Estático: cache primeiro, atualiza em segundo plano.
  // Respostas "opaque" (status 0) são o normal para CDN carregado via
  // <script>/url() sem CORS — aceitas SÓ porque o host já passou pela
  // allow-list acima (o custo de quota fica limitado a assets conhecidos).
  event.respondWith(
    caches.match(req).then((emCache) => {
      const daRede = fetch(req)
        .then((resp) => {
          const cacheavel =
            resp.ok ||
            (resp.type === "opaque" && url.origin !== self.location.origin);
          if (cacheavel) {
            const copia = resp.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(req, copia)),
            );
          }
          return resp;
        })
        .catch(() => emCache);
      return emCache || daRede;
    }),
  );
});
