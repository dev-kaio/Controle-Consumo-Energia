// Cadastro e lista de apartamentos. O select de prédio carrega o par
// "condominio|predio" no value — a rota precisa dos dois; o ID composto
// (sol-blocoA-101) é montado PELO BACKEND.
import { useState } from "react";
import { criarApartamento } from "../../api/estrutura.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function PainelApartamentos({
  condominios,
  apartamentos,
  souSuperadmin,
  aoCriar,
}) {
  const [valorPredio, setValorPredio] = useState("");
  const [numero, setNumero] = useState("");
  const [msg, setMsg] = useState(null);

  async function aoEnviar(e) {
    e.preventDefault();
    if (!valorPredio) {
      setMsg({ texto: "Cadastre um prédio primeiro", ok: false });
      return;
    }
    try {
      const [condominioID, predioID] = valorPredio.split("|");
      const body = { predioID, numero: numero.trim() };
      if (souSuperadmin) body.condominioID = condominioID;

      const r = await criarApartamento(body);
      setMsg({ texto: `Apartamento ${r.aptoID} criado!`, ok: true });
      setNumero("");
      aoCriar();
    } catch (err) {
      setMsg({ texto: err.message, ok: false });
    }
  }

  return (
    <div className="panel">
      <h2>Apartamentos</h2>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="aptoPredio">Prédio</label>
          <select
            id="aptoPredio"
            value={valorPredio}
            onChange={(e) => setValorPredio(e.target.value)}
          >
            <option value="">Selecione…</option>
            {Object.entries(condominios).flatMap(([condoId, condo]) =>
              Object.keys(condo.predios || {}).map((predioId) => (
                <option
                  key={`${condoId}|${predioId}`}
                  value={`${condoId}|${predioId}`}
                >
                  {souSuperadmin ? `${condoId} / ${predioId}` : predioId}
                </option>
              )),
            )}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="aptoNumero">Número</label>
          <input
            id="aptoNumero"
            placeholder="101"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar apartamento
        </button>
      </form>
      <MsgFeedback msg={msg} />

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Prédio</th>
            <th>Número</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(apartamentos).map(([aptoID, apto]) => (
            <tr key={aptoID}>
              <td>{aptoID}</td>
              <td>{apto.predioID}</td>
              <td>{apto.numero}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
