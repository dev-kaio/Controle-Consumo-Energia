// Registra o service worker da PWA. Incluído em todas as páginas.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Falha ao registrar service worker:", err);
    });
  });
}
