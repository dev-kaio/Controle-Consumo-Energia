// Dropdown "Filtrar" do dashboard. Vive DENTRO do header fixo, mas o
// header pertence ao AppLayout (comum a todas as páginas) — por isso o
// componente se "pluga" no encaixe do header via createPortal.
//
// Portal explicado em 1 frase: renderiza este JSX dentro de OUTRO nó do
// DOM (o slot do header), mantendo estado e eventos aqui no dashboard.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ID_SLOT_FILTRO } from "../layout/Header.jsx";

const BOTOES = [
  ["hora", "Última Hora"],
  ["dia", "Hoje"],
  ["semana", "Última Semana"],
  ["mes", "Último Mês"],
  ["ano", "Último Ano"],
  ["inicio", "Desde o Início"],
];

const TIPOS = [
  ["consumo", "Consumo"],
  ["autoconsumo", "Autoconsumo"],
  ["geracao", "Geração"],
];

export default function FiltroConsumo({
  tiposSelecionados,
  aoEscolherFiltro,
  aoEscolherIntervalo,
  aoAlternarTipo,
}) {
  const [slot, setSlot] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const menuRef = useRef(null);

  // O slot só existe no DOM depois do primeiro render do layout —
  // pega a referência após montar.
  useEffect(() => {
    setSlot(document.getElementById(ID_SLOT_FILTRO));
  }, []);

  // Tocar/clicar fora fecha o dropdown
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAberto(false);
      }
    }
    document.addEventListener("click", aoClicarFora);
    return () => document.removeEventListener("click", aoClicarFora);
  }, [aberto]);

  if (!slot) return null;

  return createPortal(
    <div ref={menuRef}>
      <button
        type="button"
        className="filter-btn"
        onClick={() => setAberto((v) => !v)}
      >
        Filtrar ▾
      </button>

      <div className={aberto ? "filter-menu aberto" : "filter-menu"}>
        {BOTOES.map(([filtro, nome]) => (
          <button
            key={filtro}
            type="button"
            data-filter={filtro}
            onClick={() => {
              aoEscolherFiltro(filtro);
              setAberto(false);
            }}
          >
            {nome}
          </button>
        ))}

        <hr />

        <div className="tipo-selecao">
          <p>Exibir no gráfico</p>
          {TIPOS.map(([tipo, nome]) => (
            <label key={tipo}>
              <input
                type="checkbox"
                checked={tiposSelecionados.includes(tipo)}
                onChange={() => aoAlternarTipo(tipo)}
              />
              {nome}
            </label>
          ))}
        </div>

        <div className="custom-range">
          <label htmlFor="inicioFiltro">Início</label>
          <input
            type="datetime-local"
            id="inicioFiltro"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
          <label htmlFor="fimFiltro">Fim</label>
          <input
            type="datetime-local"
            id="fimFiltro"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
          <button
            type="button"
            className="btn-aplicar-intervalo"
            onClick={() => {
              if (!inicio || !fim) return;
              aoEscolherIntervalo(inicio, fim);
              setAberto(false);
            }}
          >
            Aplicar intervalo
          </button>
        </div>
      </div>
    </div>,
    slot,
  );
}
