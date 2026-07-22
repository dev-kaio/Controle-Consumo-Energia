// Tour guiado: escurece a tela, destaca um elemento real por vez e explica
// o que ele é. O roteiro (e o filtro por papel) mora em roteiro.js.
//
// Duas decisões que explicam o resto do arquivo:
//
// 1. O recorte do destaque é UM div com `box-shadow: 0 0 0 9999px` — a
//    sombra gigante escurece tudo em volta e o miolo fica limpo. Sai de
//    graça o que exigiria máscara SVG ou quatro divs de moldura.
// 2. A posição do alvo é medida num laço de requestAnimationFrame enquanto
//    o tour está aberto, em vez de ouvir scroll/resize. É um listener só,
//    e acompanha de brinde o scroll suave, o gráfico que termina de
//    desenhar e o teclado do celular abrindo.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useTour } from "./TourContext.jsx";
import { roteiroDoPapel } from "./roteiro.js";

const ESPERA_ALVO_MS = 1500; // tempo que damos pro alvo aparecer antes de pular
const FOLGA = 8; // respiro entre o recorte e o elemento
const MARGEM = 12; // distância mínima do balão pras bordas da tela
const LARGURA_MAX = 340;

// Respeita quem pediu menos animação no sistema operacional
function rolagem() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function mesmoRetangulo(a, b) {
  if (!a || !b) return a === b;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

export default function Tour() {
  const { ativo, fechar } = useTour();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const passos = useMemo(() => roteiroDoPapel(role), [role]);
  const [indice, setIndice] = useState(0);
  const [alvo, setAlvo] = useState(null); // elemento do DOM
  const [caixa, setCaixa] = useState(null); // retângulo do alvo na tela
  const [alturaBalao, setAlturaBalao] = useState(0);
  const balaoRef = useRef(null);
  const [, redesenhar] = useReducer((n) => n + 1, 0);

  const passo = ativo ? passos[indice] : null;

  const avancar = useCallback(() => {
    if (indice + 1 >= passos.length) fechar();
    else setIndice(indice + 1);
  }, [indice, passos.length, fechar]);

  const voltar = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  // Toda abertura começa do primeiro passo
  useEffect(() => {
    if (ativo) setIndice(0);
  }, [ativo]);

  // Acha o alvo do passo atual — navegando de tela se precisar
  useEffect(() => {
    if (!passo) {
      setAlvo(null);
      return;
    }

    // Tela errada? navega; este efeito roda de novo quando o pathname muda.
    if (passo.rota && passo.rota !== pathname) {
      navigate(passo.rota);
      return;
    }

    // Passo sem alvo (boas-vindas, fim) = balão centralizado
    if (!passo.alvo) {
      setAlvo(null);
      return;
    }

    // A tela pode ainda estar buscando dados — insiste um pouco. Se o alvo
    // não existir mesmo (papel sem acesso àquele painel, elemento removido
    // num refactor), o passo é PULADO em vez de travar o tour.
    let cancelado = false;
    const limite = performance.now() + ESPERA_ALVO_MS;

    (function procurar() {
      if (cancelado) return;
      const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: rolagem() });
        setAlvo(el);
        return;
      }
      if (performance.now() > limite) {
        setAlvo(null);
        avancar();
        return;
      }
      requestAnimationFrame(procurar);
    })();

    return () => {
      cancelado = true;
    };
  }, [passo, pathname, navigate, avancar]);

  // Laço de medição (ver comentário do topo)
  useEffect(() => {
    if (!ativo || !alvo) {
      setCaixa(null);
      return;
    }
    let id;
    function medir() {
      const novo = alvo.getBoundingClientRect();
      setCaixa((atual) => (mesmoRetangulo(atual, novo) ? atual : novo));
      if (balaoRef.current) {
        const altura = balaoRef.current.offsetHeight;
        setAlturaBalao((atual) => (atual === altura ? atual : altura));
      }
      id = requestAnimationFrame(medir);
    }
    medir();
    return () => cancelAnimationFrame(id);
  }, [ativo, alvo]);

  // Sem alvo não há laço de medição, então o balão centralizado precisa
  // saber sozinho que a janela mudou de tamanho.
  useEffect(() => {
    if (!ativo) return;
    window.addEventListener("resize", redesenhar);
    return () => window.removeEventListener("resize", redesenhar);
  }, [ativo]);

  useEffect(() => {
    if (!ativo) return;
    function aoTeclar(e) {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") avancar();
      else if (e.key === "ArrowLeft") voltar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ativo, fechar, avancar, voltar]);

  // Leitor de tela e teclado acompanham a troca de passo
  useEffect(() => {
    if (passo) balaoRef.current?.focus({ preventScroll: true });
  }, [passo]);

  if (!passo) return null;

  const largura = Math.min(LARGURA_MAX, window.innerWidth - MARGEM * 2);
  let estiloBalao;

  if (caixa) {
    // Abaixo do alvo por padrão; acima se não couber.
    const abaixo = caixa.bottom + FOLGA + MARGEM;
    const cabeAbaixo = abaixo + alturaBalao <= window.innerHeight - MARGEM;
    const topo = cabeAbaixo
      ? abaixo
      : Math.max(MARGEM, caixa.top - FOLGA - MARGEM - alturaBalao);
    // Centralizado no alvo, mas sempre preso dentro da tela
    const centro = caixa.left + caixa.width / 2 - largura / 2;
    const esquerda = Math.min(
      Math.max(MARGEM, centro),
      window.innerWidth - largura - MARGEM,
    );
    estiloBalao = { top: topo, left: esquerda, width: largura };
  } else {
    estiloBalao = {
      top: "50%",
      left: "50%",
      width: largura,
      transform: "translate(-50%, -50%)",
    };
  }

  const ultimo = indice + 1 === passos.length;

  return (
    <div className="tour">
      {caixa ? (
        <div
          className="tour-recorte"
          style={{
            top: caixa.top - FOLGA,
            left: caixa.left - FOLGA,
            width: caixa.width + FOLGA * 2,
            height: caixa.height + FOLGA * 2,
          }}
        />
      ) : (
        <div className="tour-fundo" />
      )}

      <div
        className="tour-balao"
        ref={balaoRef}
        style={estiloBalao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tourTitulo"
        tabIndex={-1}
      >
        <span className="tour-contador">
          {indice + 1} de {passos.length}
        </span>
        <h2 id="tourTitulo">{passo.titulo}</h2>
        <p>{passo.texto}</p>

        <div className="tour-acoes">
          <button type="button" className="tour-pular" onClick={fechar}>
            Pular
          </button>
          <span className="tour-espaco" />
          {indice > 0 && (
            <button type="button" className="tour-voltar" onClick={voltar}>
              Anterior
            </button>
          )}
          <button type="button" className="btn-primary" onClick={avancar}>
            {ultimo ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
