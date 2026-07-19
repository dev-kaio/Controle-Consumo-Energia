// Gestão de inquilinos (rota /inquilinos, admin e superadmin).
// A página é dona dos dados (lista + apartamentos) e de qual modal está
// aberto; os componentes só exibem e disparam callbacks.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { listarInquilinos, atualizarUsuario } from "../api/usuarios.js";
import { listarApartamentos } from "../api/estrutura.js";
import FormInquilino from "../components/inquilinos/FormInquilino.jsx";
import TabelaInquilinos from "../components/inquilinos/TabelaInquilinos.jsx";
import ModalEditar from "../components/inquilinos/ModalEditar.jsx";
import ModalNovaSenha from "../components/ui/ModalNovaSenha.jsx";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";
import { Link } from "react-router-dom";

export default function Inquilinos() {
  const { role } = useAuth();
  const [inquilinos, setInquilinos] = useState({});
  const [apartamentos, setApartamentos] = useState({});
  const [modal, setModal] = useState(null); // {tipo:"editar",uid,u} | {tipo:"senha",uid,u}
  const [msgLista, setMsgLista] = useState(null);

  const carregar = useCallback(() => {
    listarInquilinos()
      .then(setInquilinos)
      .catch((err) => {
        console.error(err);
        setMsgLista({ texto: "Erro ao carregar inquilinos.", ok: false });
      });
  }, []);

  useEffect(() => {
    carregar();
    listarApartamentos()
      .then(setApartamentos)
      .catch((err) => console.error("Erro ao carregar apartamentos:", err));
  }, [carregar]);

  async function alternarStatus(uid, ativo) {
    try {
      await atualizarUsuario(uid, { ativo });
      carregar();
    } catch (err) {
      setMsgLista({ texto: err.message, ok: false });
    }
  }

  // Fecha o modal, mostra a confirmação na lista e recarrega
  function concluirModal(texto) {
    setModal(null);
    setMsgLista({ texto, ok: true });
    carregar();
  }

  return (
    <>
      <span className="section-title">Inquilinos</span>

      {role === "superadmin" ? (
        <p className="panel-desc">
          Você está logado como Superadmin. Para cadastrar inquilino acesse a
          página <Link to="/superadmin">Superadmin</Link>.
        </p>
      ) : (
        <FormInquilino apartamentos={apartamentos} aoCriar={carregar} />
      )}

      <div className="panel">
        <h2>Cadastrados</h2>
        <TabelaInquilinos
          inquilinos={inquilinos}
          aoAlternarStatus={alternarStatus}
          aoEditar={(uid, u) => setModal({ tipo: "editar", uid, u })}
          aoAlterarSenha={(uid, u) => setModal({ tipo: "senha", uid, u })}
        />
        <MsgFeedback msg={msgLista} />
      </div>

      {modal?.tipo === "editar" && (
        <ModalEditar
          uid={modal.uid}
          usuario={modal.u}
          apartamentos={apartamentos}
          aoFechar={() => setModal(null)}
          aoSalvar={concluirModal}
        />
      )}

      {modal?.tipo === "senha" && (
        <ModalNovaSenha
          uid={modal.uid}
          nome={modal.u.nome}
          aoFechar={() => setModal(null)}
          aoSalvar={concluirModal}
        />
      )}
    </>
  );
}
