// Header fixo de todas as páginas internas: menu, marca, tema.
// O <div className="filter-container"> é um "encaixe" vazio — o
// FiltroConsumo do dashboard se pluga nele via portal (só o dashboard
// tem filtro; as outras páginas ficam com o encaixe vazio mesmo).
import ThemeToggle from "./ThemeToggle.jsx";

export const ID_SLOT_FILTRO = "slotFiltro";

export default function Header({ aoAbrirMenu }) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="menu-btn"
        title="Menu"
        data-tour="menu"
        onClick={aoAbrirMenu}
      >
        ☰
      </button>

      <span className="brand">
        <span className="brand-nome">Palm Energy</span>
      </span>

      <span className="spacer" />

      <div className="filter-container" id={ID_SLOT_FILTRO} />

      <ThemeToggle />
    </header>
  );
}
