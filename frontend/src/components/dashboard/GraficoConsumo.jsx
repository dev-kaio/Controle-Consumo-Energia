// O gráfico principal (Chart.js via react-chartjs-2).
// O <Chart type=...> recria o canvas sozinho quando o tipo muda de
// line↔bar — nada de chart.destroy() na mão como no app antigo.
import { Chart } from "react-chartjs-2";
import "../../lib/chartSetup.js";
import { deveUsarBarras } from "../../utils/agregacao.js";

// Cores fixas dos 3 tipos (mesmas do app antigo / design system)
const DATASETS = [
  {
    tipo: "consumo",
    label: "Consumo (kWh)",
    cor: "rgba(102, 6, 235, 0.7)",
  },
  {
    tipo: "autoconsumo",
    label: "Autoconsumo (kWh)",
    cor: "rgba(0, 166, 90, 0.7)",
  },
  {
    tipo: "geracao",
    label: "Geração (kWh)",
    cor: "rgba(243, 156, 18, 0.7)",
  },
];

const OPCOES = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { ticks: { maxRotation: 0, minRotation: 0 } },
    y: { beginAtZero: true },
  },
  plugins: { legend: { labels: { font: { size: 16 } } } },
};

export default function GraficoConsumo({ labels, series, filtro, agrupamento }) {
  const tipoGrafico = deveUsarBarras(filtro, agrupamento) ? "bar" : "line";

  const data = {
    labels,
    datasets: DATASETS.map((ds) => ({
      label: ds.label,
      data: series[ds.tipo] || [],
      borderColor: ds.cor,
      backgroundColor: ds.cor,
      borderWidth: tipoGrafico === "bar" ? 2 : 3,
      fill: true,
    })),
  };

  return (
    <div className="grafico-container">
      <Chart type={tipoGrafico} data={data} options={OPCOES} />
    </div>
  );
}
