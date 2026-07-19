// Painel do superadmin (rota /superadmin): cadastro de usuários em
// qualquer condomínio + visão global agrupada.
import { useCallback, useEffect, useState } from "react";
import {
  listarTodosUsuarios,
  listarTodosCondominios,
} from "../api/superadmin.js";
import { atualizarUsuario } from "../api/usuarios.js";
import FormUsuario from "../components/superadmin/FormUsuario.jsx";
import ListaUsuarios from "../components/superadmin/ListaUsuarios.jsx";
import ModalNovaSenha from "../components/ui/ModalNovaSenha.jsx";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";

export default function Superadmin() {
  const [usuarios, setUsuarios] = useState({});
  const [condominios, setCondominios] = useState({});
  const [erro, setErro] = useState(null);
  const [modalSenha, setModalSenha] = useState(null); // {uid, nome}

  const carregar = useCallback(async () => {
    try {
      const [us, cs] = await Promise.all([
        listarTodosUsuarios(),
        listarTodosCondominios(),
      ]);
      setUsuarios(us);
      setCondominios(cs);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setErro({
        texto: "Não foi possível carregar os dados. Tente recarregar a página.",
        ok: false,
      });
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternarStatus(uid, ativo) {
    try {
      await atualizarUsuario(uid, { ativo });
      carregar();
    } catch (err) {
      setErro({ texto: err.message, ok: false });
    }
  }

  return (
    <>
      <span className="section-title">Superadmin</span>
      <FormUsuario condominios={condominios} aoCriar={carregar} />
      <ListaUsuarios
        usuarios={usuarios}
        condominios={condominios}
        aoAlternarStatus={alternarStatus}
        aoAlterarSenha={(uid, u) => setModalSenha({ uid, nome: u.nome })}
      />
      <MsgFeedback msg={erro} />

      {modalSenha && (
        <ModalNovaSenha
          uid={modalSenha.uid}
          nome={modalSenha.nome}
          aoFechar={() => setModalSenha(null)}
          aoSalvar={() => {
            setModalSenha(null);
            setErro({ texto: "Senha alterada!", ok: true });
          }}
        />
      )}
    </>
  );
}
