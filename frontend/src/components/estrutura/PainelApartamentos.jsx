// Cadastro e lista de apartamentos. O select de prédio carrega o par
// "condominio|predio" no value — a rota precisa dos dois; o ID composto
// (sol-blocoA-101) é montado PELO BACKEND.
//
// A lista foi feita pra escala: um condomínio de mil apartamentos numa tabela
// plana são mil <tr> renderizadas de uma vez, e a página trava. Três camadas
// resolvem, nesta ordem:
//   1. agrupamento por prédio em sanfona FECHADA — abre-se 1 de 10, não 10;
//   2. busca por número/ID — quem sabe o que procura não navega, digita;
//   3. teto de linhas por prédio — cobre o condomínio de prédio único, onde
//      agrupar não divide nada.
import { useMemo, useState } from "react";
import { criarApartamento } from "../../api/estrutura.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";

const LINHAS_POR_PREDIO = 50;

export default function PainelApartamentos({
  condominios,
  apartamentos,
  souSuperadmin,
  aoCriar,
}) {
  const [valorPredio, setValorPredio] = useState("");
  const [numero, setNumero] = useState("");
  const [msg, setMsg] = useState(null);

  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState({}); // "condo|predio" -> bool
  const [expandidos, setExpandidos] = useState({}); // idem, pro "mostrar mais"

  // Agrupa por prédio aplicando a busca. useMemo porque com mil apartamentos
  // isso roda a cada tecla digitada.
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const porPredio = new Map();

    for (const [aptoID, apto] of Object.entries(apartamentos)) {
      if (
        termo &&
        !aptoID.toLowerCase().includes(termo) &&
        !String(apto.numero || "").toLowerCase().includes(termo)
      ) {
        continue;
      }
      const chave = `${apto.condominioID}|${apto.predioID}`;
      if (!porPredio.has(chave)) porPredio.set(chave, []);
      porPredio.get(chave).push({ aptoID, ...apto });
    }

    for (const lista of porPredio.values()) {
      lista.sort((a, b) =>
        String(a.numero).localeCompare(String(b.numero), "pt-BR", {
          numeric: true,
        }),
      );
    }

    return [...porPredio.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "pt-BR"),
    );
  }, [apartamentos, busca]);

  const total = Object.keys(apartamentos).length;
  const encontrados = grupos.reduce((n, [, lista]) => n + lista.length, 0);
  const buscando = busca.trim().length > 0;

  function nomeDoPredio(condoId, predioId) {
    const predio = condominios[condoId]?.predios?.[predioId];
    return predio?.nome || predioId;
  }

  async function aoEnviar(e) {
    e.preventDefault();
    if (!valorPredio) {
      setMsg({ texto: "Cadastre um prédio primeiro", ok: false });
      return;
    }
    try {
      const [condominioID, predioID] = valorPredio.split("|");
      const body = { predioID, numero: numero.trim() };
      if (souSuperadmin) body.condominioID = condominioID;

      const r = await criarApartamento(body);
      setMsg({ texto: `Apartamento ${r.aptoID} criado!`, ok: true });
      setNumero("");
      // Abre o prédio onde o apartamento acabou de entrar, senão ele "some"
      // dentro de uma sanfona fechada e parece que não foi criado.
      setAbertos((a) => ({ ...a, [valorPredio]: true }));
      aoCriar();
    } catch (err) {
      console.error("Erro ao criar apartamento:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <div className="panel" data-tour="estrutura-apartamentos">
      <h2>Apartamentos</h2>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="aptoPredio">Prédio</label>
          <select
            id="aptoPredio"
            value={valorPredio}
            onChange={(e) => setValorPredio(e.target.value)}
          >
            <option value="">Selecione…</option>
            {Object.entries(condominios).flatMap(([condoId, condo]) =>
              Object.keys(condo.predios || {}).map((predioId) => (
                <option
                  key={`${condoId}|${predioId}`}
                  value={`${condoId}|${predioId}`}
                >
                  {souSuperadmin ? `${condoId} / ${predioId}` : predioId}
                </option>
              )),
            )}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="aptoNumero">Número</label>
          <input
            id="aptoNumero"
            placeholder="101"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Criar apartamento
        </button>
      </form>
      <MsgFeedback msg={msg} />

      <div className="form-linha">
        <div className="campo campo--busca">
          <label htmlFor="aptoBusca">Buscar apartamento</label>
          <input
            id="aptoBusca"
            placeholder="101 ou blocoA-101"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <span className="contador-lista">
          {buscando ? `${encontrados} de ${total}` : `${total} cadastrados`}
        </span>
      </div>

      {grupos.length === 0 && (
        <p className="lista-vazia">
          {buscando
            ? "Nenhum apartamento com esse número."
            : "Nenhum apartamento cadastrado ainda."}
        </p>
      )}

      {grupos.map(([chave, lista]) => {
        const [condoId, predioId] = chave.split("|");
        // Buscar já é o gesto de "quero achar este", então o resultado abre
        // sozinho. Mas `??` e não `||`: assim um clique explícito ainda fecha
        // o grupo durante a busca — com `||` o clique não fazia nada e a
        // sanfona parecia quebrada.
        const aberto = abertos[chave] ?? buscando;
        const limite = expandidos[chave] ? lista.length : LINHAS_POR_PREDIO;
        const visiveis = lista.slice(0, limite);
        const escondidos = lista.length - visiveis.length;

        return (
          <div className="accordion-item" key={chave}>
            <div
              className="accordion-header"
              onClick={() =>
                setAbertos((a) => ({ ...a, [chave]: !aberto }))
              }
            >
              <span>
                <span className="condo-nome">
                  {nomeDoPredio(condoId, predioId)}
                </span>{" "}
                <span className="condo-info">
                  {souSuperadmin ? `(${condoId})` : ""} — {lista.length}{" "}
                  {lista.length === 1 ? "apartamento" : "apartamentos"}
                </span>
              </span>
              <span className="arrow">{aberto ? "▲" : "▼"}</span>
            </div>

            <div
              className={
                aberto ? "accordion-content aberto" : "accordion-content"
              }
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((apto) => (
                    <tr key={apto.aptoID}>
                      <td>{apto.numero}</td>
                      <td>{apto.aptoID}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {escondidos > 0 && (
                <button
                  type="button"
                  className="btn-mostrar-mais"
                  onClick={() =>
                    setExpandidos((e) => ({ ...e, [chave]: true }))
                  }
                >
                  Mostrar mais {escondidos}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
