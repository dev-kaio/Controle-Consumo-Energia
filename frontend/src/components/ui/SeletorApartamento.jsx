// Escolha de apartamento em dois passos: prédio, depois apartamento.
//
// Existe porque um <select> com mil <option> é inutilizável — o navegador
// renderiza tudo, a lista não cabe na tela e não dá pra procurar. Em cascata
// nenhuma das duas listas passa de algumas dezenas.
//
// Devolve o aptoID composto ("sol-blocoA-101") por `aoEscolher`. Nunca monta
// esse ID na mão: usa o que veio do backend (regra do CLAUDE.md).
import { useMemo, useState } from "react";

export default function SeletorApartamento({
  apartamentos,
  valor,
  aoEscolher,
  id = "seletorApto",
  mostrarCondominio = false,
}) {
  const [chavePredio, setChavePredio] = useState("");

  // "condominio|predio" -> apartamentos daquele prédio, em ordem numérica
  const porPredio = useMemo(() => {
    const mapa = new Map();
    for (const [aptoID, apto] of Object.entries(apartamentos)) {
      const chave = `${apto.condominioID}|${apto.predioID}`;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push({ aptoID, ...apto });
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) =>
        String(a.numero).localeCompare(String(b.numero), "pt-BR", {
          numeric: true,
        }),
      );
    }
    return mapa;
  }, [apartamentos]);

  const predios = [...porPredio.keys()].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  // Prédio único: o primeiro select seria uma pergunta com uma resposta só.
  const chaveEfetiva = predios.length === 1 ? predios[0] : chavePredio;
  const daFaixa = porPredio.get(chaveEfetiva) || [];

  function trocarPredio(chave) {
    setChavePredio(chave);
    // O apartamento escolhido era de outro prédio: limpa, senão o form
    // enviaria um apto que não bate com o prédio na tela.
    aoEscolher("");
  }

  return (
    <>
      {predios.length > 1 && (
        <div className="campo">
          <label htmlFor={`${id}Predio`}>Prédio</label>
          <select
            id={`${id}Predio`}
            value={chavePredio}
            onChange={(e) => trocarPredio(e.target.value)}
          >
            <option value="">Selecione…</option>
            {predios.map((chave) => {
              const [condoId, predioId] = chave.split("|");
              return (
                <option key={chave} value={chave}>
                  {mostrarCondominio ? `${condoId} / ${predioId}` : predioId}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="campo">
        <label htmlFor={id}>Apartamento</label>
        <select
          id={id}
          value={valor || ""}
          onChange={(e) => aoEscolher(e.target.value)}
          disabled={!chaveEfetiva}
        >
          <option value="">
            {predios.length === 0
              ? "Cadastre um apartamento primeiro"
              : chaveEfetiva
                ? "Selecione…"
                : "Escolha o prédio primeiro"}
          </option>
          {daFaixa.map((apto) => (
            <option key={apto.aptoID} value={apto.aptoID}>
              {apto.numero}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
