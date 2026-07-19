// Modal de definir NOVA senha direto (admin/superadmin sobre um usuário do
// escopo dele). Chama /usuarios/senha via api. Não confundir com o
// "esqueci minha senha" do login, que é self-service por e-mail.
import { useState } from "react";
import Modal from "./Modal.jsx";
import CampoSenha from "./CampoSenha.jsx";
import MsgFeedback from "./MsgFeedback.jsx";
import { alterarSenha } from "../../api/usuarios.js";

export default function ModalNovaSenha({ uid, nome, aoFechar, aoSalvar }) {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    if (senha.length < 6) {
      setMsg({ texto: "A senha deve ter pelo menos 6 caracteres.", ok: false });
      return;
    }
    if (senha !== confirma) {
      setMsg({ texto: "As senhas não conferem.", ok: false });
      return;
    }
    setEnviando(true);
    try {
      await alterarSenha(uid, senha);
      aoSalvar("Senha alterada!");
    } catch (err) {
      setMsg({ texto: err.message, ok: false });
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Alterar Senha" aoFechar={aoFechar}>
      <p className="panel-desc">
        Defina a nova senha{nome ? ` de ${nome}` : ""}.
      </p>
      <form onSubmit={aoEnviar}>
        <CampoSenha
          id="novaSenha"
          label="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <CampoSenha
          id="confirmaSenha"
          label="Confirmar senha"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <MsgFeedback msg={msg} />
      </form>
    </Modal>
  );
}
