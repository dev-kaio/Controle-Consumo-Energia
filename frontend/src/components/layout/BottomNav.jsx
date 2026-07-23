// Barra de navegação inferior — SÓ no mobile (o CSS a esconde no desktop).
// É a via rápida dos destinos principais, no alcance do polegar; o drawer
// hambúrguer (Sidebar.jsx) continua guardando o resto (Superadmin, Tutorial,
// Configurações, Sair). Por isso aqui ficam no máx. 4 itens.
//
// NavLink (e não Link): a classe "active" sai de graça e destaca a aba da
// tela atual — que é o ponto de uma barra de abas.
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";

// Glyph + label curta, seguindo a estética de emoji/texto do app (⚡/☰),
// sem introduzir biblioteca de ícones.
const ITENS = {
  inquilino: [
    ["/dashboard", "📊", "Início"],
    ["/config", "⚙️", "Ajustes"],
  ],
  gestor: [
    ["/dashboard", "📊", "Início"],
    ["/inquilinos", "👥", "Inquilinos"],
    ["/estrutura", "🏢", "Estrutura"],
    ["/fechamento", "🧾", "Fechamento"],
  ],
};

export default function BottomNav() {
  const { role } = useAuth();
  const souGestor = role === "admin" || role === "superadmin";
  const itens = souGestor ? ITENS.gestor : ITENS.inquilino;

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {itens.map(([para, glyph, label]) => (
        <NavLink
          key={para}
          to={para}
          className={({ isActive }) =>
            isActive ? "bottom-nav-item active" : "bottom-nav-item"
          }
        >
          <span className="bottom-nav-glyph" aria-hidden="true">
            {glyph}
          </span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
