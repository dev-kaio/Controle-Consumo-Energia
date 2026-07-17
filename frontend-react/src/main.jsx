import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
