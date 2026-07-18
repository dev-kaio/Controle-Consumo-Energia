// Painel do superadmin (rota /superadmin): cadastro de usuários em
// qualquer condomínio + visão global agrupada.
import { useCallback, useEffect, useState } from "react";
import {
  listarTodosUsuarios,
  listarTodosCondominios,
} from "../api/superadmin.js";
import FormUsuario from "../components/superadmin/FormUsuario.jsx";
import ListaUsuarios from "../components/superadmin/ListaUsuarios.jsx";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";

export default function Superadmin() {
  const [usuarios, setUsuarios] = useState({});
  const [condominios, setCondominios] = useState({});
  const [erro, setErro] = useState(null);

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

  return (
    <>
      <span className="section-title">Superadmin</span>
      <FormUsuario condominios={condominios} aoCriar={carregar} />
      <ListaUsuarios usuarios={usuarios} condominios={condominios} />
      <MsgFeedback msg={erro} />
    </>
  );
}
