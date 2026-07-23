// Fatura de um apartamento numa competência — /fatura?aptoID=&competencia=
//
// É o entregável que o síndico passa pro morador, então a tela é um DOCUMENTO,
// não um painel: mostra de onde saiu cada número (leitura inicial, final,
// tarifa aplicada) pra dar pra conferir contra o visor do medidor sem acesso
// ao banco.
//
// "Salvar PDF" é o window.print() do navegador de propósito — o diálogo nativo
// já tem "Salvar como PDF" em todo desktop e celular, e uma biblioteca de PDF
// custaria centenas de KB no bundle de um app que roda offline.
//
// Não tem seletor de apartamento: chega-se aqui pelo card do dashboard ou pela
// linha do fechamento, que já sabem de quem é a conta.
import { useSearchParams, Link } from "react-router-dom";
import useFinanceiro from "../hooks/useFinanceiro.js";
import { competenciaAtual } from "../api/financeiro.js";
import {
  competenciaLegivel,
  formatarReais,
  aptoSemCondominio,
} from "../utils/formatos.js";

function dataBR(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kWh(valor) {
  return `${Number(valor || 0).toFixed(2)} kWh`;
}

export default function Fatura() {
  const [busca] = useSearchParams();
  const aptoID = busca.get("aptoID") || undefined;
  const competencia = busca.get("competencia") || competenciaAtual();

  const { fatura, carregando, erro } = useFinanceiro(aptoID, competencia);

  if (!aptoID) {
    return (
      <div className="panel">
        <p className="msg-feedback erro">
          Nenhum apartamento informado. Abra a fatura pelo dashboard ou pelo
          fechamento do mês.
        </p>
      </div>
    );
  }

  if (carregando) {
    return <div className="panel">Carregando fatura…</div>;
  }

  if (erro || !fatura) {
    return (
      <div className="panel">
        <p className="msg-feedback erro">{erro || "Fatura indisponível."}</p>
        <Link className="kpi-link" to="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  const { apartamento, periodo, tarifa, valores } = fatura;
  const tarifaDeOutroMes = fatura.competenciaTarifaAplicada !== competencia;

  return (
    <>
      <div className="fatura-acoes">
        <Link className="kpi-link" to="/dashboard">
          ← Voltar
        </Link>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.print()}
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <article className="fatura">
        <header className="fatura-cabecalho">
          <div>
            <h1>Conta de energia</h1>
            <p className="fatura-condominio">{apartamento.condominioNome}</p>
          </div>
          <div className="fatura-competencia">
            <span className="fatura-rotulo">Competência</span>
            <strong>{competenciaLegivel(competencia)}</strong>
          </div>
        </header>

        <section className="fatura-identificacao">
          <div>
            <span className="fatura-rotulo">Apartamento</span>
            <strong>{apartamento.numero}</strong>
          </div>
          <div>
            <span className="fatura-rotulo">Prédio</span>
            <strong>{apartamento.predioNome}</strong>
          </div>
          <div>
            <span className="fatura-rotulo">Identificador</span>
            <strong>{aptoSemCondominio(fatura.apartamentoId)}</strong>
          </div>
        </section>

        {!periodo.temLeitura && (
          <p className="msg-feedback erro">
            Este apartamento não tem leituras suficientes no mês. O valor abaixo
            é zero por falta de medição, não por consumo zero — confira o
            medidor antes de entregar esta conta.
          </p>
        )}

        <section>
          <h2>Medição</h2>
          <table className="data-table">
            <tbody>
              <tr>
                <td>Leitura inicial</td>
                <td>{kWh(periodo.leituraInicial)}</td>
                <td>{dataBR(periodo.dataInicial)}</td>
              </tr>
              <tr>
                <td>Leitura final</td>
                <td>{kWh(periodo.leituraFinal)}</td>
                <td>{dataBR(periodo.dataFinal)}</td>
              </tr>
              <tr className="fatura-linha-forte">
                <td>Consumo faturado</td>
                <td colSpan={2}>{kWh(fatura.kwhFaturado)}</td>
              </tr>
            </tbody>
          </table>
          <p className="fatura-nota">
            O medidor acumula desde que foi ligado. O consumo do mês é a
            diferença entre as duas leituras, com os reinícios do medidor já
            tratados.
          </p>
        </section>

        <section>
          <h2>Cálculo</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tarifa</th>
                <th>Quantidade</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TUSD — distribuição</td>
                <td>{formatarReais(tarifa.tusd)}/kWh</td>
                <td>{kWh(fatura.kwhFaturado)}</td>
                <td>{formatarReais(valores.tusd)}</td>
              </tr>
              <tr>
                <td>TE — energia</td>
                <td>{formatarReais(tarifa.te)}/kWh</td>
                <td>{kWh(fatura.kwhFaturado)}</td>
                <td>{formatarReais(valores.te)}</td>
              </tr>
              <tr>
                <td>Subtotal</td>
                <td colSpan={2} />
                <td>{formatarReais(valores.tusdMaisTe)}</td>
              </tr>
              <tr>
                <td>IP-CIP — iluminação pública</td>
                <td>{(tarifa.ipCipPercentual * 100).toFixed(2)}%</td>
                <td>sobre o subtotal</td>
                <td>{formatarReais(valores.ipCip)}</td>
              </tr>
              <tr className="fatura-linha-forte">
                <td>Total</td>
                <td colSpan={2} />
                <td>{formatarReais(valores.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="fatura-rodape">
          <p>
            Tarifas informadas <strong>já com os tributos</strong> (ICMS, PIS e
            COFINS), como aparecem na fatura da distribuidora. Nenhum imposto é
            somado por cima.
          </p>
          <p>
            Tarifa aplicada: competência{" "}
            {competenciaLegivel(fatura.competenciaTarifaAplicada)}
            {tarifaDeOutroMes &&
              " (a mais recente cadastrada antes desta competência)"}
            .
          </p>
        </footer>
      </article>
    </>
  );
}
