// KPIs do topo: gauge de potência + valor da conta.
// PLACEHOLDERS por enquanto — os dados virão de GET /financeiro e do
// campo de potência do ESP32 quando esses endpoints entrarem no ar
// (mesmo estado do app antigo; o desenho SVG é idêntico).

// Circunferência do arco: 2π × raio(42) ≈ 263.9
const CIRCUNFERENCIA = 263.9;

export default function KpiPlaceholders() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-card--gauge">
        <div className="gauge">
          <svg viewBox="0 0 100 100">
            <circle className="gauge-track" cx="50" cy="50" r="42" />
            <circle
              className="gauge-fill"
              cx="50"
              cy="50"
              r="42"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={CIRCUNFERENCIA}
            />
          </svg>
        </div>
        <div>
          <div className="kpi-label">Potência atual</div>
          <div className="kpi-value">— kW</div>
          <div className="kpi-hint">aguardando medidor</div>
        </div>
      </div>

      <div className="kpi-card kpi-card--money">
        <div className="kpi-label">
          <span className="kpi-icon">💰</span> Valor da conta
        </div>
        <div className="kpi-value">R$ —,--</div>
        <div className="kpi-hint">competência atual</div>
      </div>
    </div>
  );
}
