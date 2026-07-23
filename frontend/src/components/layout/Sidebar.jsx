// Menu lateral off-canvas. Links variam por papel:
//   inquilino  -> Dashboard, Configurações
//   admin      -> + Inquilinos, Estrutura
//   superadmin -> + Superadmin
// Tocar fora fecha (essencial no celular) — o overlay invisível cuida disso.
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useTour } from "../tour/TourContext.jsx";

export default function Sidebar({ aberta, fechar }) {
  const { role, sair } = useAuth();
  const { abrir: abrirTour } = useTour();

  async function aoSair(e) {
    e.preventDefault();
    await sair();
    // O RequireRole redireciona pro login sozinho quando o perfil some
  }

  return (
    <>
      {aberta && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 900 }}
          onClick={fechar}
        />
      )}

      <nav className={aberta ? "sidebar active" : "sidebar"}>
        <Link to="/dashboard" onClick={fechar}>
          Dashboard
        </Link>

        {role === "superadmin" && (
          <Link to="/superadmin" onClick={fechar}>
            Superadmin
          </Link>
        )}

        {(role === "admin" || role === "superadmin") && (
          <>
            <Link to="/inquilinos" onClick={fechar}>
              Inquilinos
            </Link>
            <Link to="/estrutura" onClick={fechar}>
              Estrutura
            </Link>
          </>
        )}

        {/* Não navega: dispara o tour guiado na tela em que ele começa */}
        <a
          href="#tutorial"
          onClick={(e) => {
            e.preventDefault();
            fechar();
            abrirTour();
          }}
        >
          Tutorial
        </a>

        <Link to="/config" onClick={fechar}>
          Configurações
        </Link>

        <a href="/" onClick={aoSair}>
          Sair
        </a>
      </nav>
    </>
  );
}
