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
  // Data é obrigatória; hora é opcional (vazia = dia inteiro).
  const [dataInicio, setDataInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
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
        data-tour="filtro"
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
          <label htmlFor="dataInicioFiltro">Início</label>
          <div className="campo-data-hora">
            <input
              type="date"
              lang="pt-BR"
              id="dataInicioFiltro"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <input
              type="time"
              lang="pt-BR"
              aria-label="Hora de início (opcional)"
              placeholder="Hora (opcional)"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <label htmlFor="dataFimFiltro">Fim</label>
          <div className="campo-data-hora">
            <input
              type="date"
              lang="pt-BR"
              id="dataFimFiltro"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
            <input
              type="time"
              lang="pt-BR"
              aria-label="Hora de fim (opcional)"
              placeholder="Hora (opcional)"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>

          <div className="acoes-intervalo">
            <button
              type="button"
              className="btn-aplicar-intervalo"
              onClick={() => {
                if (!dataInicio || !dataFim) return;
                // Hora vazia → dia inteiro: início no começo, fim no fim do dia.
                const inicio = `${dataInicio}T${horaInicio || "00:00"}`;
                const fim = `${dataFim}T${horaFim || "23:59:59.999"}`;
                aoEscolherIntervalo(inicio, fim);
                setAberto(false);
              }}
            >
              Aplicar intervalo
            </button>
            <button
              type="button"
              className="btn-limpar-intervalo"
              onClick={() => {
                // Zera os campos e volta pro filtro padrão ("Desde o Início").
                setDataInicio("");
                setHoraInicio("");
                setDataFim("");
                setHoraFim("");
                aoEscolherFiltro("inicio");
                setAberto(false);
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>,
    slot,
  );
}
