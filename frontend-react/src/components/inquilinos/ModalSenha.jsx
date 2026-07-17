// Modal de redefinição de senha — envia o link pelo Firebase Auth.
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../auth/firebase.js";
import Modal from "../ui/Modal.jsx";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function ModalSenha({ emailInicial, aoFechar, aoEnviado }) {
  const [email, setEmail] = useState(emailInicial || "");
  const [msg, setMsg] = useState(null);

  async function aoEnviar(e) {
    e.preventDefault();
    if (!email) {
      setMsg({ texto: "Preencha o email!", ok: false });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      aoEnviado("E-mail de redefinição enviado!");
    } catch (err) {
      console.error(err);
      setMsg({ texto: "Erro ao enviar e-mail.", ok: false });
    }
  }

  return (
    <Modal titulo="Alterar Senha" aoFechar={aoFechar}>
      <p className="panel-desc">Informe o email para redefinição da senha</p>
      <form onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="alterarSenhaEmail">Email</label>
          <input
            id="alterarSenhaEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Enviar
        </button>
        <MsgFeedback msg={msg} />
      </form>
    </Modal>
  );
}
