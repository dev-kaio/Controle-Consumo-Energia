// Cadastro e lista de medidores ESP32.
// A CHAVE do medidor só existe na resposta do cadastro — mostramos uma
// única vez no chave-box; depois de sair da página, era.
import { useState } from "react";
import { criarDispositivo } from "../../api/estrutura.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function PainelMedidores({ apartamentos, dispositivos, aoCriar }) {
  const [espId, setEspId] = useState("");
  const [aptoID, setAptoID] = useState("");
  const [chaveGerada, setChaveGerada] = useState(null);
  const [msg, setMsg] = useState(null);

  async function aoEnviar(e) {
    e.preventDefault();
    try {
      const r = await criarDispositivo({ espId: espId.trim(), aptoID });
      setMsg({ texto: `Medidor ${r.espId} cadastrado!`, ok: true });
      setChaveGerada(r.chave);
      setEspId("");
      aoCriar();
    } catch (err) {
      setMsg({ texto: err.message, ok: false });
    }
  }

  return (
    <div className="panel" data-tour="estrutura-medidores">
      <h2>Medidores ESP32</h2>
      <p className="panel-desc">
        Cada medidor pertence a um apartamento e autentica com a chave
        gerada no cadastro.
      </p>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="dispId">ID do medidor</label>
          <input
            id="dispId"
            placeholder="esp-sol-101"
            value={espId}
            onChange={(e) => setEspId(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="dispApto">Apartamento</label>
          <select
            id="dispApto"
            value={aptoID}
            onChange={(e) => setAptoID(e.target.value)}
          >
            <option value="">Selecione…</option>
            {Object.keys(apartamentos).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Cadastrar medidor
        </button>
      </form>
      <MsgFeedback msg={msg} />

      {chaveGerada && (
        <div className="chave-box">
          Anote a chave — ela NÃO será mostrada de novo (vai no header
          x-api-key da ESP):
          <code>{chaveGerada}</code>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Medidor</th>
            <th>Apartamento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(dispositivos).map(([id, disp]) => (
            <tr key={id}>
              <td>{id}</td>
              <td>{disp.aptoID}</td>
              <td>
                <span className={disp.ativo ? "badge" : "badge badge--off"}>
                  {disp.ativo ? "Ativo" : "Revogado"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
