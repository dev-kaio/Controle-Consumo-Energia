// Conta do apartamento na competência. Devolve
// { fatura, carregando, erro, faltaCadastro }.
//
// `faltaCadastro` separa 404 dos demais erros de propósito: num condomínio
// recém-criado, "ainda não tem tarifa" é o estado NORMAL — pintar isso de
// vermelho ensina o síndico a ignorar o vermelho.
import { useEffect, useState } from "react";
import { buscarFinanceiro } from "../api/financeiro.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";

export default function useFinanceiro(aptoID, competencia, habilitado = true) {
  const [estado, setEstado] = useState({
    fatura: null,
    carregando: habilitado,
    erro: null,
    faltaCadastro: false,
  });

  useEffect(() => {
    if (!habilitado || !aptoID || !competencia) {
      setEstado({
        fatura: null,
        carregando: false,
        erro: null,
        faltaCadastro: false,
      });
      return;
    }

    const controlador = new AbortController();

    (async () => {
      setEstado((e) => ({ ...e, carregando: true }));
      try {
        const fatura = await buscarFinanceiro(
          aptoID,
          competencia,
          controlador.signal,
        );
        if (controlador.signal.aborted) return;
        setEstado({
          fatura,
          carregando: false,
          erro: null,
          faltaCadastro: false,
        });
      } catch (err) {
        if (controlador.signal.aborted || err.name === "AbortError") return;
        console.error("Erro ao buscar financeiro:", err);
        setEstado({
          fatura: null,
          carregando: false,
          erro: mensagemAmigavel(err),
          faltaCadastro: err.status === 404,
        });
      }
    })();

    return () => controlador.abort();
  }, [aptoID, competencia, habilitado]);

  return estado;
}
