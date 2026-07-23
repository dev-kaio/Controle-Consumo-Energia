// Porteiro das rotas internas (substitui o verificarToken antigo).
//
// Uso no App.jsx:
//   <Route element={<RequireRole roles={["admin", "superadmin"]} />}>
//     ...rotas que só admin/superadmin veem
//   </Route>
//
// Sem roles => basta estar logado. Regras de redirect (iguais às antigas):
//   carregando  -> tela de espera (não decide nada antes da sessão restaurar)
//   sem sessão  -> volta pro login "/"
//   role errada -> vai pro /dashboard (a tela que todo mundo tem)
//   inativo     -> barrado no login (Login.jsx) e sem perfil aqui
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireRole({ roles = [] }) {
  const { carregando, perfil, role } = useAuth();

  if (carregando) {
    return (
      <main className="dashboard">
        <span className="section-title">Carregando…</span>
      </main>
    );
  }

  if (!perfil) return <Navigate to="/" replace />;

  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
