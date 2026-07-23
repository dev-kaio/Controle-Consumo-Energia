// Fechamento de competência (/fechamento, admin e superadmin): a conta de
// todos os apartamentos do condomínio num mês.
//
// NÃO carrega sozinha ao abrir. Um condomínio de 1000 apartamentos são 2000
// leituras do Firebase — isso acontece quando o síndico pede, não toda vez
// que ele passa pela tela.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { buscarFechamento } from "../api/fechamento.js";
import { competenciaAtual } from "../api/financeiro.js";
import { listarCondominios } from "../api/estrutura.js";
import { baixarCSV } from "../utils/csv.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";
import {
  competenciaLegivel,
  formatarReais,
  aptoSemCondominio,
} from "../utils/formatos.js";

export default function Fechamento() {
  const { role } = useAuth();
  const souSuperadmin = role === "superadmin";

  const [condominios, setCondominios] = useState({});
  const [condoId, setCondoId] = useState("");
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [resultado, setResultado] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState(null);

  // O select de condomínio só existe pro superadmin; o admin fecha o dele.
  useEffect(() => {
    if (!souSuperadmin) return;
    listarCondominios()
      .then((cs) => {
        setCondominios(cs);
        setCondoId((atual) => atual || Object.keys(cs)[0] || "");
      })
      .catch((err) => {
        console.error("Erro ao listar condomínios:", err);
        setMsg({ texto: mensagemAmigavel(err), ok: false });
      });
  }, [souSuperadmin]);

  async function gerar() {
    setGerando(true);
    setMsg(null);
    // Some com o relatório antigo na hora: deixar a tabela do mês passado na
    // tela enquanto calcula o novo é como se lê o número errado.
    setResultado(null);
    try {
      const dados = await buscarFechamento(
        souSuperadmin ? condoId : undefined,
        competencia,
      );
      setResultado(dados);
      if (dados.totais.semLeitura > 0) {
        setMsg({
          texto: `${dados.totais.semLeitura} de ${dados.totais.apartamentos} apartamentos não têm leitura no mês — confira os medidores antes de entregar as contas.`,
          ok: false,
        });
      }
    } catch (err) {
      console.error("Erro ao gerar fechamento:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
    setGerando(false);
  }

  return (
    <>
      <span className="section-title">Fechamento do mês</span>

      <div className="panel" data-tour="fechamento">
        <p className="panel-desc">
          A conta de todos os apartamentos numa competência. Os valores são
          calculados na hora a partir das leituras e da tarifa vigente — se a
          tarifa for corrigida depois, gere de novo.
        </p>

        <div className="form-linha">
          {souSuperadmin && (
            <div className="campo">
              <label htmlFor="fechCondominio">Condomínio</label>
              <select
                id="fechCondominio"
                value={condoId}
                onChange={(e) => setCondoId(e.target.value)}
              >
                {Object.entries(condominios).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.nome || id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="campo">
            <label htmlFor="fechCompetencia">Competência</label>
            <input
              id="fechCompetencia"
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={gerar}
            disabled={gerando || (souSuperadmin && !condoId)}
          >
            {gerando ? "Calculando…" : "Gerar fechamento"}
          </button>

          {resultado && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => baixarCSV(resultado)}
            >
              Baixar CSV
            </button>
          )}
        </div>

        <MsgFeedback msg={msg} />
      </div>

      {resultado && (
        <div className="panel">
          <h2>
            {resultado.condominioNome} ·{" "}
            {competenciaLegivel(resultado.competencia)}
          </h2>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total do condomínio</div>
              <div className="kpi-value">
                {formatarReais(resultado.totais.total)}
              </div>
              <div className="kpi-hint">
                {resultado.totais.apartamentos} apartamentos
              </div>
            </div>
            <div className="kpi-card kpi-card--consumo">
              <div className="kpi-label">Consumo total</div>
              <div className="kpi-value">
                {resultado.totais.kwhFaturado.toFixed(2)} kWh
              </div>
              <div className="kpi-hint">
                tarifa de{" "}
                {competenciaLegivel(resultado.competenciaTarifaAplicada)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Sem leitura</div>
              <div className="kpi-value">{resultado.totais.semLeitura}</div>
              <div
                className={
                  resultado.totais.semLeitura > 0
                    ? "kpi-hint kpi-hint--alerta"
                    : "kpi-hint"
                }
              >
                {resultado.totais.semLeitura > 0
                  ? "medidores a conferir"
                  : "todos mediram"}
              </div>
            </div>
          </div>

          <table className="data-table" style={{ marginTop: "16px" }}>
            <thead>
              <tr>
                <th>Apartamento</th>
                <th>Prédio</th>
                <th>Morador</th>
                <th>Consumo</th>
                <th>Valor</th>
                <th>Fatura</th>
              </tr>
            </thead>
            <tbody>
              {resultado.aptos.map((a) => (
                <tr key={a.aptoID} className={a.temLeitura ? undefined : "linha-alerta"}>
                  <td>{aptoSemCondominio(a.aptoID)}</td>
                  <td>{a.predioNome}</td>
                  <td>{a.morador || "—"}</td>
                  <td>
                    {a.temLeitura ? (
                      `${a.kwhFaturado.toFixed(2)} kWh`
                    ) : (
                      <span className="texto-alerta">sem leitura</span>
                    )}
                  </td>
                  <td>{formatarReais(a.total)}</td>
                  <td>
                    <Link
                      className="link-consumo"
                      to={`/fatura?aptoID=${encodeURIComponent(a.aptoID)}&competencia=${resultado.competencia}`}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
