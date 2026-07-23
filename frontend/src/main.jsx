import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";

// Registra o service worker (gerado pelo vite-plugin-pwa no build;
// em dev não existe e a chamada é inofensiva).
registerSW();

// Faxina única: remove o cache do service worker ANTIGO (pré-React) dos
// clientes que já tinham o app instalado. Pode sair daqui depois de uns
// meses em produção.
if ("caches" in window) {
  caches.delete("palm-energy-v2").catch(() => {});
}

// CSS global — a ordem importa: tokens primeiro, base depois, componentes
// por último. Os seletores são os mesmos do design system antigo
// (ver docs/DESIGN-SYSTEM.md).
import "./styles/variables.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/forms.css";
import "./styles/tables.css";
import "./styles/modal.css";
import "./styles/login.css";
import "./styles/tour.css";
import "./styles/fatura.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
