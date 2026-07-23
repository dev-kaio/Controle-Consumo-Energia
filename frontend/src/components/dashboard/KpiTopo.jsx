// KPIs do topo do dashboard: potência instantânea e valor da conta.
//
// Os dois números são POR APARTAMENTO. Gestor sem apartamento escolhido não vê
// nenhum dos dois de propósito: somar mil aptos custaria mil leituras do
// Firebase a cada abertura da tela. O total do condomínio é assunto do
// fechamento de competência, que roda sob demanda.
//
// O anel de progresso saiu daqui. Anel de porcentagem precisa de um teto
// (potência contratada) que o modelo de dados não tem — e inventar um teto
// fixo daria uma barra que mente pra apto grande e pra apto pequeno. O CSS
// de .gauge continua em dashboard.css, reservado pra quando o campo existir.
import { Link } from "react-router-dom";
import useUltimaLeitura from "../../hooks/useUltimaLeitura.js";
import useFinanceiro from "../../hooks/useFinanceiro.js";
import { competenciaAtual } from "../../api/financeiro.js";
import {
  competenciaLegivel,
  formatarPotencia,
  formatarReais,
  idadeRelativa,
  LEITURA_VELHA_MS,
} from "../../utils/formatos.js";

// As duas funções abaixo traduzem "estado da busca" em "o que o card mostra".
// Ficam fora do componente porque são decisão pura: dá pra ler de uma vez só
// tudo que cada card pode virar.

function estadoDaPotencia({ semAlvo, hintSemAlvo, carregando, erro, leitura }) {
  if (semAlvo) return { valor: "—", hint: hintSemAlvo };
  if (erro) return { valor: "—", hint: erro, alerta: true };
  if (carregando) return { valor: "—", hint: "carregando…" };
  if (!leitura?.timestamp) return { valor: "—", hint: "sem leitura ainda" };

  const idade = idadeRelativa(leitura.timestamp);
  const velha =
    Date.now() - new Date(leitura.timestamp).getTime() > LEITURA_VELHA_MS;

  // Medidor mudo não é consumo zero — mostrar "0 W" calado seria mentira.
  if (velha) return { valor: "—", hint: `sem leitura ${idade}`, alerta: true };

  // Leitura fresca mas sem o campo: dado gravado antes de a ESP mandar
  // potência.
  if (leitura.potencia == null) {
    return { valor: "—", hint: "este medidor não envia potência" };
  }

  return { valor: formatarPotencia(leitura.potencia), hint: idade };
}

function estadoDoValor({
  semAlvo,
  hintSemAlvo,
  carregando,
  erro,
  faltaCadastro,
  fatura,
  competencia,
}) {
  const vazio = "R$ —,--";

  if (semAlvo) return { valor: vazio, hint: hintSemAlvo };
  // 404 = falta cadastro (tarifa ou apartamento). Num condomínio novo isso é
  // o estado normal, então não leva cor de erro.
  if (erro) return { valor: vazio, hint: erro, alerta: !faltaCadastro };
  if (carregando) return { valor: vazio, hint: "carregando…" };
  if (!fatura) return { valor: vazio, hint: "sem dados" };

  if (!fatura.periodo?.temLeitura) {
    return {
      valor: formatarReais(0),
      hint: "sem leitura no mês",
      alerta: true,
    };
  }

  return {
    valor: formatarReais(fatura.valores.total),
    hint: `${fatura.kwhFaturado.toFixed(1)} kWh · ${competenciaLegivel(competencia)}`,
  };
}

export default function KpiTopo({ aptoID, souGestor }) {
  // Sem apartamento alvo há dois motivos bem diferentes: o gestor ainda não
  // escolheu um (normal, tem link), ou a conta do inquilino está sem apto
  // vinculado (problema de cadastro).
  const semAlvo = !aptoID;
  const hintSemAlvo = souGestor
    ? "escolha um apartamento"
    : "apartamento não vinculado à sua conta";

  const competencia = competenciaAtual();
  const comum = { semAlvo, hintSemAlvo };

  const leituraAtual = useUltimaLeitura(aptoID, !semAlvo);
  const financeiro = useFinanceiro(aptoID, competencia, !semAlvo);

  const potencia = estadoDaPotencia({ ...comum, ...leituraAtual });
  const valor = estadoDoValor({ ...comum, competencia, ...financeiro });

  return (
    <div className="kpi-grid" data-tour="kpis">
      <div className="kpi-card kpi-card--potencia">
        <div className="kpi-label">
          <span className="kpi-icon">⚡</span> Potência atual
        </div>
        <div className="kpi-value">{potencia.valor}</div>
        <div className={potencia.alerta ? "kpi-hint kpi-hint--alerta" : "kpi-hint"}>
          {potencia.hint}
        </div>
      </div>

      <div className="kpi-card kpi-card--money">
        <div className="kpi-label">
          <span className="kpi-icon">💰</span> Valor da conta
        </div>
        <div className="kpi-value">{valor.valor}</div>
        <div className={valor.alerta ? "kpi-hint kpi-hint--alerta" : "kpi-hint"}>
          {valor.hint}
        </div>
        {semAlvo && souGestor && (
          <Link className="kpi-link" to="/inquilinos">
            Escolher inquilino
          </Link>
        )}
      </div>
    </div>
  );
}
