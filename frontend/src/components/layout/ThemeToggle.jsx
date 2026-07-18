import useTema from "../../hooks/useTema.js";

// Botão ☀️/🌙 — usado no header e (flutuante) na tela de login.
export default function ThemeToggle({ className = "theme-toggle" }) {
  const { escuro, alternar } = useTema();

  return (
    <button
      type="button"
      className={className}
      title="Alternar tema"
      onClick={alternar}
    >
      {escuro ? "☀️" : "🌙"}
    </button>
  );
}
