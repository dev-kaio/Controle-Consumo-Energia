// Dashboard — a MESMA página pra admin e inquilino:
//   - admin/superadmin: vê tudo, alterna gráfico ↔ cards por inquilino,
//     e pode abrir /dashboard?aptoID=... pra inspecionar um apto
//   - inquilino: o backend já limita as leituras ao apto dele; o botão
//     de alternar visão some
// Quem manda nos dados é o useConsumo; aqui só mora o estado do filtro.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import useConsumo from "../hooks/useConsumo.js";
import FiltroConsumo from "../components/dashboard/FiltroConsumo.jsx";
import KpiTopo from "../components/dashboard/KpiTopo.jsx";
import MediasConsumo from "../components/dashboard/MediasConsumo.jsx";
import GraficoConsumo from "../components/dashboard/GraficoConsumo.jsx";
import CardsInquilinos from "../components/dashboard/CardsInquilinos.jsx";
import { aptoSemCondominio } from "../utils/formatos.js";

export default function Dashboard() {
  const { role, perfil } = useAuth();
  const souGestor = role === "admin" || role === "superadmin";

  // ?aptoID= na URL tem prioridade absoluta (admin vindo da lista de
  // inquilinos); o backend valida se ele pode ver esse apto.
  const [buscaURL] = useSearchParams();
  const aptoID = buscaURL.get("aptoID") || undefined;

  // Apartamento dos KPIs (potência e conta são números POR APARTAMENTO).
  // O inquilino não carrega aptoID na URL — o dele vem do perfil. Isto é só
  // pra saber o que pedir; quem decide se pode é o backend (escopoUtils.js).
  const aptoAlvo = souGestor ? aptoID : perfil?.aptoID || undefined;

  const [consulta, setConsulta] = useState({ filtro: "inicio" });
  const [tipos, setTipos] = useState(["consumo", "autoconsumo", "geracao"]);
  const [visao, setVisao] = useState("grafico"); // "grafico" | "inquilinos"

  const dados = useConsumo({ ...consulta, aptoID }, tipos);

  function alternarTipo(tipo) {
    setTipos((atuais) =>
      atuais.includes(tipo)
        ? atuais.filter((t) => t !== tipo)
        : [...atuais, tipo],
    );
  }

  return (
    <>
      <FiltroConsumo
        tiposSelecionados={tipos}
        aoEscolherFiltro={(filtro) => setConsulta({ filtro })}
        aoEscolherIntervalo={(inicio, fim) => setConsulta({ inicio, fim })}
        aoAlternarTipo={alternarTipo}
      />

      <span className="section-title">
        {aptoID ? `Apto ${aptoSemCondominio(aptoID)}` : "Dashboard"}
      </span>

      <KpiTopo aptoID={aptoAlvo} souGestor={souGestor} />

      <MediasConsumo medias={dados.medias} nomeFiltro={dados.nomeFiltro} />

      <div className="chart-card" data-tour="grafico">
        <div className="chart-header">
          <h2>Balanço energético</h2>
          {souGestor && !aptoID && (
            <button
              type="button"
              className="btn-trocar-disposicao"
              onClick={() =>
                setVisao((v) => (v === "grafico" ? "inquilinos" : "grafico"))
              }
            >
              {visao === "grafico" ? "Ver por inquilino" : "Ver gráfico"}
            </button>
          )}
        </div>

        {dados.erro && <p className="msg-feedback erro">{dados.erro}</p>}

        {visao === "grafico" ? (
          <GraficoConsumo
            labels={dados.labels}
            series={dados.series}
            filtro={consulta.filtro}
            agrupamento={dados.agrupamento}
          />
        ) : (
          <CardsInquilinos
            dadosBrutos={dados.dadosBrutos}
            nomeFiltro={dados.nomeFiltro}
          />
        )}
      </div>
    </>
  );
}
