// Ativa/desativa um usuário e recarrega a lista. Compartilhado entre as telas
// que listam usuários (Inquilinos e Superadmin) — a única diferença entre elas
// é como recarregam e onde mostram o erro, então recebem isso por parâmetro.
//
// Uso:
//   const alternarStatus = useAlternarStatus(carregar, setMsg);
//   <button onClick={() => alternarStatus(uid, !u.ativo)} />
import { useCallback } from "react";
import { atualizarUsuario } from "../api/usuarios.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";

export default function useAlternarStatus(recarregar, setMsg) {
  return useCallback(
    async (uid, ativo) => {
      try {
        await atualizarUsuario(uid, { ativo });
        recarregar();
      } catch (err) {
        console.error("Erro ao alternar status:", err);
        setMsg({ texto: mensagemAmigavel(err), ok: false });
      }
    },
    [recarregar, setMsg],
  );
}
