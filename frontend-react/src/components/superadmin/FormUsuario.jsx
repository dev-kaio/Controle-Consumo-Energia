// Form unificado do superadmin: cria admin OU inquilino em qualquer
// condomínio. O campo de apartamento só aparece pra inquilino, e a
// lista de aptos depende do condomínio escolhido.
import { useEffect, useState } from "react";
import { criarInquilino } from "../../api/usuarios.js";
import { listarApartamentos } from "../../api/estrutura.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

const FORM_VAZIO = {
  tipo: "inquilino",
  nome: "",
  email: "",
  senha: "",
  condominioID: "",
  aptoID: "",
};

export default function FormUsuario({ condominios, aoCriar }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [apartamentos, setApartamentos] = useState({});
  const [msg, setMsg] = useState(null);

  function campo(nome) {
    return {
      value: form[nome],
      onChange: (e) => setForm({ ...form, [nome]: e.target.value }),
    };
  }

  // Aptos disponíveis acompanham o condomínio escolhido
  useEffect(() => {
    if (!form.condominioID) {
      setApartamentos({});
      return;
    }
    listarApartamentos(form.condominioID)
      .then(setApartamentos)
      .catch((err) => console.error("Erro ao carregar apartamentos:", err));
  }, [form.condominioID]);

  async function aoEnviar(e) {
    e.preventDefault();

    if (!form.nome || !form.email || !form.senha || !form.condominioID) {
      setMsg({ texto: "Preencha todos os campos!", ok: false });
      return;
    }
    if (form.tipo === "inquilino" && !form.aptoID) {
      setMsg({
        texto: "Inquilino precisa de apartamento (cadastre na Estrutura)",
        ok: false,
      });
      return;
    }

    try {
      const body = {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        condominioID: form.condominioID,
        tipo: form.tipo,
      };
      if (form.tipo === "inquilino") body.aptoID = form.aptoID;

      await criarInquilino(body);
      setMsg({
        texto: `${form.tipo === "admin" ? "Admin" : "Inquilino"} criado!`,
        ok: true,
      });
      setForm(FORM_VAZIO);
      aoCriar();
    } catch (err) {
      setMsg({ texto: err.message, ok: false });
    }
  }

  return (
    <div className="panel">
      <h2>Novo usuário</h2>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="tipoUsuario">Tipo</label>
          <select id="tipoUsuario" {...campo("tipo")}>
            <option value="inquilino">Inquilino</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="suNome">Nome</label>
          <input id="suNome" placeholder="Nome completo" {...campo("nome")} />
        </div>
        <div className="campo">
          <label htmlFor="suEmail">Email</label>
          <input
            id="suEmail"
            type="email"
            placeholder="email@exemplo.com"
            {...campo("email")}
          />
        </div>
        <div className="campo">
          <label htmlFor="suSenha">Senha inicial</label>
          <input
            id="suSenha"
            type="password"
            placeholder="Senha"
            {...campo("senha")}
          />
        </div>
        <div className="campo">
          <label htmlFor="suCondominio">Condomínio</label>
          <select id="suCondominio" {...campo("condominioID")}>
            <option value="">Selecione…</option>
            {Object.entries(condominios).map(([id, c]) => (
              <option key={id} value={id}>
                {c.nome} ({id})
              </option>
            ))}
          </select>
        </div>
        {form.tipo === "inquilino" && (
          <div className="campo">
            <label htmlFor="suApto">Apartamento</label>
            <select id="suApto" {...campo("aptoID")}>
              <option value="">Selecione…</option>
              {Object.keys(apartamentos).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary">
          Cadastrar
        </button>
      </form>
      <MsgFeedback msg={msg} />
    </div>
  );
}
