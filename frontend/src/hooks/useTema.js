// Tema claro/escuro.
//
// A fonte da verdade é a classe "dark" no <body> (o CSS inteiro reage a
// ela via variáveis — ver styles/variables.css) + localStorage "tema".
// O index.html aplica a classe ANTES do React montar (anti-flash);
// este hook só alterna e persiste.
import { useState } from "react";

export default function useTema() {
  const [escuro, setEscuro] = useState(() =>
    document.body.classList.contains("dark"),
  );

  function alternar() {
    const novoEscuro = !escuro;
    document.body.classList.toggle("dark", novoEscuro);
    localStorage.setItem("tema", novoEscuro ? "dark" : "light");
    setEscuro(novoEscuro);
  }

  return { escuro, alternar };
}
