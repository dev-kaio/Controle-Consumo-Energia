// Form de cadastro de inquilino (só admin — superadmin cadastra pelo
// painel dele, que escolhe o condomínio).
import { useState } from "react";
import { criarInquilino } from "../../api/usuarios.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

const FORM_VAZIO = { nome: "", email: "", senha: "", aptoID: "" };

export default function FormInquilino({ apartamentos, aoCriar }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [msg, setMsg] = useState(null);

  function campo(nome) {
    return {
      value: form[nome],
      onChange: (e) => setForm({ ...form, [nome]: e.target.value }),
    };
  }

  async function aoEnviar(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha || !form.aptoID) {
      setMsg({ texto: "Preencha todos os campos!", ok: false });
      return;
    }
    try {
      await criarInquilino(form);
      setMsg({ texto: "Inquilino criado!", ok: true });
      setForm(FORM_VAZIO);
      aoCriar();
    } catch (err) {
      console.error("Erro ao criar inquilino:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <div className="panel">
      <h2>Novo inquilino</h2>
      <p className="panel-desc">
        O apartamento precisa existir na Estrutura antes de cadastrar o
        morador.
      </p>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input id="nome" placeholder="Nome completo" {...campo("nome")} />
        </div>
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            {...campo("email")}
          />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha inicial</label>
          <input
            id="senha"
            type="password"
            placeholder="Senha"
            {...campo("senha")}
          />
        </div>
        <div className="campo">
          <label htmlFor="aptoID">Apartamento</label>
          <select id="aptoID" {...campo("aptoID")}>
            <option value="">Selecione…</option>
            {Object.keys(apartamentos).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Cadastrar
        </button>
      </form>
      <MsgFeedback msg={msg} />
    </div>
  );
}
