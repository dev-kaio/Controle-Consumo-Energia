// Cadastro e lista de prédios. Superadmin escolhe o condomínio;
// admin cria sempre no dele (o backend resolve pelo token).
import { useState } from "react";
import { criarPredio } from "../../api/estrutura.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function PainelPredios({ condominios, souSuperadmin, aoCriar }) {
  const [form, setForm] = useState({ id: "", nome: "", condominioID: "" });
  const [msg, setMsg] = useState(null);

  async function aoEnviar(e) {
    e.preventDefault();
    try {
      const body = { id: form.id, nome: form.nome };
      if (souSuperadmin) body.condominioID = form.condominioID;
      await criarPredio(body);
      setMsg({ texto: "Prédio criado!", ok: true });
      setForm({ id: "", nome: "", condominioID: form.condominioID });
      aoCriar();
    } catch (err) {
      console.error("Erro ao criar prédio:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <div className="panel" data-tour="estrutura-predios">
      <h2>Prédios</h2>
      <form className="form-linha" onSubmit={aoEnviar}>
        {souSuperadmin && (
          <div className="campo">
            <label htmlFor="predioCondominio">Condomínio</label>
            <select
              id="predioCondominio"
              value={form.condominioID}
              onChange={(e) =>
                setForm({ ...form, condominioID: e.target.value })
              }
            >
              <option value="">Selecione…</option>
              {Object.entries(condominios).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.nome || id}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="campo">
          <label htmlFor="predioId">Identificador</label>
          <input
            id="predioId"
            placeholder="blocoA"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
          />
        </div>
        <div className="campo">
          <label htmlFor="predioNome">Nome</label>
          <input
            id="predioNome"
            placeholder="Bloco A"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar prédio
        </button>
      </form>
      <MsgFeedback msg={msg} />

      <table className="data-table">
        <thead>
          <tr>
            <th>Condomínio</th>
            <th>Prédio</th>
            <th>Nome</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(condominios).flatMap(([condoId, condo]) =>
            Object.entries(condo.predios || {}).map(([predioId, predio]) => (
              <tr key={`${condoId}-${predioId}`}>
                <td>{condo.nome || condoId}</td>
                <td>{predioId}</td>
                <td>{predio.nome || "-"}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
