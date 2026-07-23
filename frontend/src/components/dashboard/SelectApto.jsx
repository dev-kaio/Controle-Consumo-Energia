// Seletor de apartamento do header — só para gestor (admin/superadmin).
// Deixa o gestor "entrar" no consumo de qualquer inquilino sem sair do
// dashboard: trocar a opção só troca o search param `aptoID` da URL, e o
// dashboard inteiro (KPIs, gráfico, médias, título) recarrega sozinho —
// aptoID é a fonte única da verdade daqui (ver pages/Dashboard.jsx).
//
// Vive no header (comum a todas as páginas), então se pluga no encaixe via
// createPortal — mesmo mecanismo do FiltroConsumo.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { listarInquilinos } from "../../api/usuarios.js";
import { aptoSemCondominio } from "../../utils/formatos.js";
import { ID_SLOT_FILTRO } from "../layout/Header.jsx";

export default function SelectApto() {
  const { role } = useAuth();
  const souGestor = role === "admin" || role === "superadmin";

  const [slot, setSlot] = useState(null);
  const [aptos, setAptos] = useState([]);
  const [busca, setBusca] = useSearchParams();
  const aptoID = busca.get("aptoID") || "";

  // O slot só existe no DOM depois do primeiro render do layout.
  useEffect(() => {
    setSlot(document.getElementById(ID_SLOT_FILTRO));
  }, []);

  useEffect(() => {
    if (!souGestor) return;
    let ativo = true;
    listarInquilinos()
      .then((mapa) => {
        if (!ativo) return;
        const lista = Object.values(mapa)
          .filter((u) => u.ativo && u.aptoID)
          .map((u) => ({ aptoID: u.aptoID, nome: u.nome || "" }))
          .sort((a, b) => a.aptoID.localeCompare(b.aptoID, "pt-BR"));
        setAptos(lista);
      })
      .catch((err) => console.error("Erro ao buscar inquilinos:", err));
    return () => {
      ativo = false;
    };
  }, [souGestor]);

  if (!souGestor || !slot) return null;

  function aoTrocar(e) {
    const valor = e.target.value;
    if (valor) setBusca({ aptoID: valor });
    else setBusca({}); // "Todos os aptos" — volta pra visão do condomínio
  }

  return createPortal(
    <select
      className="select-apto"
      aria-label="Selecionar apartamento"
      value={aptoID}
      onChange={aoTrocar}
    >
      <option value="">Todos os aptos</option>
      {aptos.map((a) => (
        <option key={a.aptoID} value={a.aptoID}>
          {aptoSemCondominio(a.aptoID)} - {a.nome}
        </option>
      ))}
    </select>,
    slot,
  );
}
