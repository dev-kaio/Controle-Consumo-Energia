// Cadastro e lista de medidores ESP32.
// A CHAVE do medidor só existe na resposta do cadastro — mostramos uma
// única vez no chave-box; depois de sair da página, era.
import { useMemo, useState } from "react";
import { criarDispositivo } from "../../api/estrutura.js";
import { mensagemAmigavel } from "../../utils/mensagensErro.js";
import MsgFeedback from "../ui/MsgFeedback.jsx";
import SeletorApartamento from "../ui/SeletorApartamento.jsx";

export default function PainelMedidores({ apartamentos, dispositivos, aoCriar }) {
  const [espId, setEspId] = useState("");
  const [aptoID, setAptoID] = useState("");
  const [chaveGerada, setChaveGerada] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busca, setBusca] = useState("");

  // Mesma escala da lista de apartamentos: um medidor por apto significa
  // mil linhas num condomínio grande.
  const listados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return Object.entries(dispositivos)
      .filter(
        ([id, disp]) =>
          !termo ||
          id.toLowerCase().includes(termo) ||
          String(disp.aptoID || "").toLowerCase().includes(termo),
      )
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR", { numeric: true }));
  }, [dispositivos, busca]);

  async function aoEnviar(e) {
    e.preventDefault();
    try {
      const r = await criarDispositivo({ espId: espId.trim(), aptoID });
      setMsg({ texto: `Medidor ${r.espId} cadastrado!`, ok: true });
      setChaveGerada(r.chave);
      setEspId("");
      aoCriar();
    } catch (err) {
      console.error("Erro ao criar medidor:", err);
      setMsg({ texto: mensagemAmigavel(err), ok: false });
    }
  }

  return (
    <div className="panel" data-tour="estrutura-medidores">
      <h2>Medidores ESP32</h2>
      <p className="panel-desc">
        Cada medidor pertence a um apartamento e autentica com a chave
        gerada no cadastro.
      </p>
      <form className="form-linha" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="dispId">ID do medidor</label>
          <input
            id="dispId"
            placeholder="esp-sol-101"
            value={espId}
            onChange={(e) => setEspId(e.target.value)}
          />
        </div>
        <SeletorApartamento
          id="dispApto"
          apartamentos={apartamentos}
          valor={aptoID}
          aoEscolher={setAptoID}
          mostrarCondominio
        />
        <button type="submit" className="btn-primary">
          Cadastrar medidor
        </button>
      </form>
      <MsgFeedback msg={msg} />

      {chaveGerada && (
        <div className="chave-box">
          Anote a chave — ela NÃO será mostrada de novo (vai no header
          x-api-key da ESP):
          <code>{chaveGerada}</code>
        </div>
      )}

      <div className="form-linha">
        <div className="campo campo--busca">
          <label htmlFor="dispBusca">Buscar medidor</label>
          <input
            id="dispBusca"
            placeholder="esp001 ou blocoA-101"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <span className="contador-lista">
          {listados.length} de {Object.keys(dispositivos).length}
        </span>
      </div>

      {listados.length === 0 ? (
        <p className="lista-vazia">
          {busca.trim()
            ? "Nenhum medidor com esse identificador."
            : "Nenhum medidor cadastrado ainda."}
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Medidor</th>
              <th>Apartamento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {listados.map(([id, disp]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{disp.aptoID}</td>
                <td>
                  <span className={disp.ativo ? "badge" : "badge badge--off"}>
                    {disp.ativo ? "Ativo" : "Revogado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
