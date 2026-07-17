// Grade de cards por inquilino (só admin/superadmin).
// A lista de inquilinos vem do backend (já filtrada por condomínio);
// os totais são somados das leituras que o dashboard já buscou.
import { useEffect, useState } from "react";
import { listarInquilinos } from "../../api/usuarios.js";
import { totaisPorApartamento } from "../../utils/agregacao.js";
import CardInquilino from "./CardInquilino.jsx";

const ZERADO = { consumo: 0, autoconsumo: 0, geracao: 0 };

export default function CardsInquilinos({ dadosBrutos, nomeFiltro }) {
  const [inquilinos, setInquilinos] = useState([]);

  useEffect(() => {
    let ativo = true;
    listarInquilinos()
      .then((mapa) => {
        if (!ativo) return;
        const lista = Object.entries(mapa)
          .filter(([, u]) => u.ativo)
          .map(([uid, u]) => ({ uid, nome: u.nome, aptoID: u.aptoID }));
        setInquilinos(lista);
      })
      .catch((err) => console.error("Erro ao buscar inquilinos:", err));
    return () => {
      ativo = false;
    };
  }, []);

  const totais = totaisPorApartamento(dadosBrutos);

  return (
    <div className="inquilino-container">
      {inquilinos.map((inq) => (
        <CardInquilino
          key={inq.uid}
          inquilino={inq}
          totais={totais[inq.aptoID] || ZERADO}
          nomeFiltro={nomeFiltro}
        />
      ))}
    </div>
  );
}
