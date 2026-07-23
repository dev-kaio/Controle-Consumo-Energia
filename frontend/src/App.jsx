// Mapa de rotas do app. Cada <Route> aponta pra uma página em src/pages/.
//
// Camadas (de fora pra dentro):
//   AuthProvider  — sessão disponível pra tudo
//   RequireRole   — porteiro: barra quem não pode ver a rota
//   AppLayout     — header + sidebar em volta do conteúdo
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import RequireRole from "./auth/RequireRole.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Fatura from "./pages/Fatura.jsx";
import Inquilinos from "./pages/Inquilinos.jsx";
import Estrutura from "./pages/Estrutura.jsx";
import Fechamento from "./pages/Fechamento.jsx";
import Superadmin from "./pages/Superadmin.jsx";
import Config from "./pages/Config.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* pública */}
          <Route path="/" element={<Login />} />

          {/* logado (qualquer papel) */}
          <Route element={<RequireRole />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Fora da Sidebar de propósito: chega-se por link contextual
                  (card do dashboard, linha do fechamento), nunca "solta" —
                  a rota exige saber de qual apartamento é a conta. */}
              <Route path="/fatura" element={<Fatura />} />
              <Route path="/config" element={<Config />} />
            </Route>
          </Route>

          {/* admin e superadmin */}
          <Route element={<RequireRole roles={["admin", "superadmin"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/inquilinos" element={<Inquilinos />} />
              <Route path="/estrutura" element={<Estrutura />} />
              <Route path="/fechamento" element={<Fechamento />} />
            </Route>
          </Route>

          {/* só superadmin */}
          <Route element={<RequireRole roles={["superadmin"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/superadmin" element={<Superadmin />} />
            </Route>
          </Route>

          {/* rota desconhecida → dashboard (que manda pro login se preciso) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
