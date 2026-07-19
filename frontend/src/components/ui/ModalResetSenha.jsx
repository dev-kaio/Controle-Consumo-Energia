// "Esqueci minha senha" — self-service: envia o link de redefinição pelo
// Firebase Auth para o próprio usuário. Fica no login (não exige estar logado).
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../auth/firebase.js";
import Modal from "./Modal.jsx";
import MsgFeedback from "./MsgFeedback.jsx";

export default function ModalResetSenha({ emailInicial = "", aoFechar }) {
  const [email, setEmail] = useState(emailInicial);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    if (!email) {
      setMsg({ texto: "Preencha o email!", ok: false });
      return;
    }
    setEnviando(true);
    const MSG_NEUTRA = {
      texto: "Se o email existir, o link de redefinição foi enviado.",
      ok: true,
    };
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg(MSG_NEUTRA);
    } catch (err) {
      console.error(err);
      // Erros que o usuário PODE corrigir viram mensagem clara. Os demais
      // (ex.: auth/user-not-found) ficam neutros pra não revelar se o email
      // existe (evita enumeração de contas).
      if (err.code === "auth/invalid-email") {
        setMsg({ texto: "E-mail inválido.", ok: false });
      } else if (err.code === "auth/network-request-failed") {
        setMsg({ texto: "Falha de conexão. Tente novamente.", ok: false });
      } else {
        setMsg(MSG_NEUTRA);
      }
    }
    setEnviando(false);
  }

  return (
    <Modal titulo="Esqueci minha senha" aoFechar={aoFechar}>
      <p className="panel-desc">
        Informe seu email e enviaremos um link para redefinir a senha.
      </p>
      <form onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="resetSenhaEmail">Email</label>
          <input
            id="resetSenhaEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar link"}
        </button>
        <MsgFeedback msg={msg} />
      </form>
    </Modal>
  );
}
