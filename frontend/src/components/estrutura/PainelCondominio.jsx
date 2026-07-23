// Cadastro de condomínio — só superadmin enxerga (Estrutura.jsx decide).
import { useState } from "react";
import { criarCondominio } from "../../api/estrutura.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

const FORM_VAZIO = { id: "", nome: "", localizacao: "" };

export default function PainelCondominio({ aoCriar }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [msg, setMsg] = useState(null);

  async function aoEnviar(e) {
    e.preventDefault();
    try {
      await criarCondominio(form);
      setMsg({ texto: "Condomínio criado!", ok: true });
      setForm(FORM_VAZIO);
      aoCriar();
    } catch (err) {
      console.error("Erro ao criar condomínio:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <div className="panel">
      <h2>Condomínio</h2>
      <p className="panel-desc">
        Identificador só com letras e números (ex: sol) — ele vira o
        prefixo dos IDs de apartamento.
      </p>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="condoId">Identificador</label>
          <input
            id="condoId"
            placeholder="sol"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
          />
        </div>
        <div className="campo">
          <label htmlFor="condoNome">Nome</label>
          <input
            id="condoNome"
            placeholder="Residencial Sol"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div className="campo">
          <label htmlFor="condoLocal">Localização</label>
          <input
            id="condoLocal"
            placeholder="Cidade/UF"
            value={form.localizacao}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar condomínio
        </button>
      </form>
      <MsgFeedback msg={msg} />
    </div>
  );
}
