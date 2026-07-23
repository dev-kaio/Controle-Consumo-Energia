// Modal de edição de inquilino.
// Se o apto atual do inquilino saiu da estrutura (removido/renomeado),
// entra como opção "fora da estrutura" — sem isso o select cairia num
// valor qualquer e o salvar trocaria o apto sem querer.
import { useState } from "react";
import { atualizarUsuario } from "../../api/usuarios.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import Modal from "../ui/Modal.jsx";
import MsgFeedback from "../ui/MsgFeedback.jsx";

export default function ModalEditar({ uid, usuario, apartamentos, aoFechar, aoSalvar }) {
  // E-mail não é editável: é a identidade de login (Firebase Auth). Só nome
  // e apartamento passam pela edição.
  const [form, setForm] = useState({
    nome: usuario.nome || "",
    aptoID: usuario.aptoID || "",
  });
  const [msg, setMsg] = useState(null);

  const aptoForaDaEstrutura =
    form.aptoID && !Object.keys(apartamentos).includes(usuario.aptoID)
      ? usuario.aptoID
      : null;

  async function aoEnviar(e) {
    e.preventDefault();
    if (!form.nome || !form.aptoID) {
      setMsg({ texto: "Preencha todos os campos!", ok: false });
      return;
    }
    try {
      await atualizarUsuario(uid, form);
      aoSalvar("Inquilino atualizado!");
    } catch (err) {
      console.error("Erro ao atualizar inquilino:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <Modal titulo="Editar Inquilino" aoFechar={aoFechar}>
      <form onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="editarNome">Nome</label>
          <input
            id="editarNome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div className="campo">
          <label htmlFor="editarApartamento">Apartamento</label>
          <select
            id="editarApartamento"
            value={form.aptoID}
            onChange={(e) => setForm({ ...form, aptoID: e.target.value })}
          >
            {aptoForaDaEstrutura && (
              <option value={aptoForaDaEstrutura}>
                {aptoForaDaEstrutura} (fora da estrutura)
              </option>
            )}
            {Object.keys(apartamentos).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Salvar Alterações
        </button>
        <MsgFeedback msg={msg} />
      </form>
    </Modal>
  );
}
