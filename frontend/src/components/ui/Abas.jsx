// Abas genéricas. SÓ A ABA ATIVA É RENDERIZADA — é isso que faz a Estrutura
// aguentar mil apartamentos: as outras seções nem existem no DOM.
//
// A aba ativa vive na URL (?aba=medidores), não em estado local nem no
// localStorage. Três motivos:
//   - o localStorage é só pra preferência do aparelho (tema, tutorial visto);
//   - dá pra mandar link direto pra uma aba;
//   - o tour guiado precisa navegar até a aba de cada passo (ver Tour.jsx).
//
// Uso: <Abas abas={[{ id, rotulo, conteudo: <Painel/> }]} />
// Aba com `conteudo` nulo é ignorada — assim o chamador filtra por papel
// sem precisar montar o array condicionalmente.
import { useSearchParams } from "react-router-dom";

export default function Abas({ abas }) {
  const [busca, setBusca] = useSearchParams();

  const disponiveis = abas.filter((a) => a && a.conteudo);
  if (disponiveis.length === 0) return null;

  const pedida = busca.get("aba");
  // Aba inexistente na URL (link velho, papel sem acesso) cai na primeira em
  // vez de mostrar tela vazia.
  const ativa = disponiveis.some((a) => a.id === pedida)
    ? pedida
    : disponiveis[0].id;

  function trocar(id) {
    const novo = new URLSearchParams(busca);
    novo.set("aba", id);
    // replace: trocar de aba não é passo de navegação — senão o botão
    // "voltar" teria que desfazer cada clique antes de sair da página.
    setBusca(novo, { replace: true });
  }

  return (
    <>
      <div className="abas" role="tablist">
        {disponiveis.map((aba) => (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={aba.id === ativa}
            className={aba.id === ativa ? "aba aba--ativa" : "aba"}
            onClick={() => trocar(aba.id)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      <div className="aba-conteudo" role="tabpanel">
        {disponiveis.find((a) => a.id === ativa)?.conteudo}
      </div>
    </>
  );
}
