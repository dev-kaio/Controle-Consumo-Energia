// Registro único do Chart.js — precisa rodar ANTES de qualquer gráfico
// renderizar (sem isso: erro `"category" is not a registered scale`).
// Importado uma vez pelo GraficoConsumo.
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);
