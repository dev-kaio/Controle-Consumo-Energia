// Estado do tour guiado, compartilhado por quem dispara (menu, Configurações)
// e por quem desenha (Tour.jsx). Contexto porque os dois lados estão em
// galhos diferentes da árvore: a Sidebar é irmã do <Outlet/>, e a página de
// Configurações é filha dele.
//
// Sobre o localStorage: "já vi o tutorial" é preferência DESTE APARELHO, da
// mesma natureza do tema — não é sessão nem papel (esses vêm sempre do
// /auth/role, nunca daqui). São as duas únicas chaves do projeto.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CHAVE_TOUR } from "./roteiro.js";

const ContextoTour = createContext(null);

export function useTour() {
  const contexto = useContext(ContextoTour);
  if (!contexto) throw new Error("useTour precisa estar dentro de <TourProvider>");
  return contexto;
}

export default function TourProvider({ children }) {
  const [ativo, setAtivo] = useState(false);

  const abrir = useCallback(() => setAtivo(true), []);

  // Fechar (por conclusão, "Pular" ou Esc) marca como visto: quem já passou
  // por aqui não é abordado de novo a cada login.
  const fechar = useCallback(() => {
    setAtivo(false);
    try {
      localStorage.setItem(CHAVE_TOUR, "1");
    } catch {
      // navegador com storage bloqueado: o tour só reaparece, não quebra
    }
  }, []);

  // Primeira visita: abre sozinho, com uma folga pro primeiro render assentar
  // (o dashboard ainda está buscando dados quando o layout monta).
  useEffect(() => {
    let jaViu = true;
    try {
      jaViu = localStorage.getItem(CHAVE_TOUR) === "1";
    } catch {
      // sem storage não dá pra saber — não incomoda o usuário
    }
    if (jaViu) return;
    const id = setTimeout(() => setAtivo(true), 800);
    return () => clearTimeout(id);
  }, []);

  return (
    <ContextoTour.Provider value={{ ativo, abrir, fechar }}>
      {children}
    </ContextoTour.Provider>
  );
}
