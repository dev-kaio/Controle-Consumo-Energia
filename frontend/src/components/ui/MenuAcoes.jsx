// Botão de engrenagem (⚙) que abre um popover com ações. Genérico: os itens
// vêm como children. Fecha ao clicar fora — mesmo padrão do FiltroConsumo.
//
// O popover é position:fixed com coordenadas calculadas a partir do botão.
// Motivo: a tabela vive dentro de .accordion-item { overflow:hidden }, que
// cortaria um popover absoluto na última linha — fixed escapa desse clip.
//
// Uso:
//   <MenuAcoes>
//     <button type="button" onClick={...}>Alterar senha</button>
//     <button type="button" onClick={...}>Desativar</button>
//   </MenuAcoes>
// O menu se fecha sozinho quando um item é clicado.
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const LARGURA = 176; // px — precisa bater com o .menu-acoes-lista no CSS

export default function MenuAcoes({ children, titulo = "Ações" }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const listaRef = useRef(null);

  // Posiciona o popover logo abaixo do ⚙, alinhado à direita dele.
  useLayoutEffect(() => {
    if (!aberto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.right - LARGURA });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e) {
      if (
        !btnRef.current?.contains(e.target) &&
        !listaRef.current?.contains(e.target)
      ) {
        setAberto(false);
      }
    }
    // Rolar ou redimensionar invalida a posição fixa → fecha.
    function aoMexer() {
      setAberto(false);
    }
    document.addEventListener("click", aoClicarFora);
    window.addEventListener("scroll", aoMexer, true);
    window.addEventListener("resize", aoMexer);
    return () => {
      document.removeEventListener("click", aoClicarFora);
      window.removeEventListener("scroll", aoMexer, true);
      window.removeEventListener("resize", aoMexer);
    };
  }, [aberto]);

  return (
    <div className="menu-acoes">
      <button
        type="button"
        ref={btnRef}
        className="menu-acoes-btn"
        title={titulo}
        aria-label={titulo}
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        ⚙
      </button>

      {aberto && (
        // onClick no container: qualquer ação clicada fecha o menu depois.
        <div
          ref={listaRef}
          className="menu-acoes-lista"
          style={{ top: pos.top, left: pos.left }}
          onClick={() => setAberto(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
