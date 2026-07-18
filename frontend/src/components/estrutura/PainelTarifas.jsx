// Tarifas por condomínio/competência — só superadmin.
// TUSD/TE/IP-CIP já vêm COM tributos embutidos (ICMS/PIS/COFINS) —
// nunca aplicar imposto de novo (docs/TARIFAS-FINANCEIRO.md).
// Na tela o IP-CIP é % (ex: 4); no banco é fração (0.04).
import { useEffect, useState } from "react";
import { listarTarifas, salvarTarifa } from "../../api/estrutura.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function PainelTarifas({ condominios }) {
  const [condoId, setCondoId] = useState("");
  const [tarifas, setTarifas] = useState({});
  const [form, setForm] = useState({ competencia: "", tusd: "", te: "", ipCip: "" });
  const [msg, setMsg] = useState(null);

  // Primeiro condomínio vira seleção inicial quando a lista chega
  useEffect(() => {
    const primeiro = Object.keys(condominios)[0];
    if (primeiro && !condoId) setCondoId(primeiro);
  }, [condominios, condoId]);

  useEffect(() => {
    if (!condoId) return;
    listarTarifas(condoId)
      .then(setTarifas)
      .catch((err) => setMsg({ texto: err.message, ok: false }));
  }, [condoId]);

  async function aoEnviar(e) {
    e.preventDefault();
    try {
      await salvarTarifa({
        condominioID: condoId,
        competencia: form.competencia,
        tusd: Number(form.tusd),
        te: Number(form.te),
        ipCipPercentual: Number(form.ipCip) / 100,
      });
      setMsg({ texto: "Tarifa salva!", ok: true });
      setTarifas(await listarTarifas(condoId));
    } catch (err) {
      setMsg({ texto: err.message, ok: false });
    }
  }

  // Competências mais recentes primeiro (chave AAAA-MM ordena por texto)
  const ordenadas = Object.entries(tarifas).sort((a, b) =>
    a[0] < b[0] ? 1 : -1,
  );

  return (
    <div className="panel">
      <h2>Tarifas (R$/kWh, com tributos)</h2>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="tarifaCondominio">Condomínio</label>
          <select
            id="tarifaCondominio"
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
        <div className="campo">
          <label htmlFor="tarifaCompetencia">Competência</label>
          <input
            id="tarifaCompetencia"
            type="month"
            value={form.competencia}
            onChange={(e) => setForm({ ...form, competencia: e.target.value })}
          />
        </div>
        <div className="campo">
          <label htmlFor="tarifaTusd">TUSD</label>
          <input
            id="tarifaTusd"
            type="number"
            step="0.0001"
            placeholder="0.5387"
            value={form.tusd}
            onChange={(e) => setForm({ ...form, tusd: e.target.value })}
          />
        </div>
        <div className="campo">
          <label htmlFor="tarifaTe">TE</label>
          <input
            id="tarifaTe"
            type="number"
            step="0.0001"
            placeholder="0.3411"
            value={form.te}
            onChange={(e) => setForm({ ...form, te: e.target.value })}
          />
        </div>
        <div className="campo">
          <label htmlFor="tarifaIpCip">IP-CIP (%)</label>
          <input
            id="tarifaIpCip"
            type="number"
            step="0.01"
            placeholder="4"
            value={form.ipCip}
            onChange={(e) => setForm({ ...form, ipCip: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Salvar tarifa
        </button>
      </form>
      <MsgFeedback msg={msg} />

      <table className="data-table">
        <thead>
          <tr>
            <th>Competência</th>
            <th>TUSD</th>
            <th>TE</th>
            <th>IP-CIP</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map(([competencia, t]) => (
            <tr key={competencia}>
              <td>{competencia}</td>
              <td>R$ {Number(t.tusd).toFixed(4)}</td>
              <td>R$ {Number(t.te).toFixed(4)}</td>
              <td>{((t.ipCip?.percentual || 0) * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
