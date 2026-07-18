// Configurações: dados da conta + redefinição de senha.
// Os dados vêm do perfil no AuthContext (fonte: backend via /auth/role) —
// nada de localStorage. O email vem do Firebase Auth.
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../auth/firebase.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";

const ROTULOS_TIPO = {
  superadmin: "Dono do sistema",
  admin: "Administrador do condomínio",
  inquilino: "Inquilino",
};

export default function Config() {
  const { usuario, perfil } = useAuth();
  const [emailReset, setEmailReset] = useState(usuario?.email || "");
  const [msg, setMsg] = useState(null);

  async function aoRedefinir(e) {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, emailReset);
      setMsg({
        texto: "Email de redefinição enviado! Confira sua caixa de entrada.",
        ok: true,
      });
    } catch (err) {
      console.error(err);
      setMsg({ texto: "Erro ao enviar o email. Confira o endereço.", ok: false });
    }
  }

  return (
    <>
      <span className="section-title">Configurações</span>

      <div className="panel">
        <h2>Minha conta</h2>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Nome</td>
              <td>{perfil?.nome || "—"}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>{usuario?.email || "—"}</td>
            </tr>
            <tr>
              <td>Perfil</td>
              <td>{ROTULOS_TIPO[perfil?.tipo] || perfil?.tipo || "—"}</td>
            </tr>
            {perfil?.aptoID && (
              <tr>
                <td>Apartamento</td>
                <td>{perfil.aptoID}</td>
              </tr>
            )}
            {perfil?.condominioID && (
              <tr>
                <td>Condomínio</td>
                <td>{perfil.condominioID}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Segurança</h2>
        <p className="panel-desc">
          Enviamos um link de redefinição de senha pro seu email.
        </p>
        <form className="form-linha" onSubmit={aoRedefinir}>
          <div className="campo">
            <label htmlFor="emailReset">Email</label>
            <input
              type="email"
              id="emailReset"
              value={emailReset}
              onChange={(e) => setEmailReset(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Enviar link
          </button>
        </form>
        <MsgFeedback msg={msg} />
      </div>

      <div className="panel">
        <h2>Aparência</h2>
        <p className="panel-desc">
          O tema claro/escuro fica no botão ☀️/🌙 do topo da tela — a
          preferência é salva neste aparelho.
        </p>
      </div>
    </>
  );
}
