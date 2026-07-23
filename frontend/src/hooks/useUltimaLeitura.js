// Potência instantânea do apartamento, revalidada sozinha.
//
// Intervalo casado com o SEND_INTERVAL da ESP (60 s): buscar mais rápido não
// traz dado novo, só gasta leitura do Firebase. Ver docs/FIRMWARE.md.
//
// Devolve { leitura, carregando, erro }. `leitura.timestamp === null` é
// resposta válida: o apartamento existe e simplesmente ainda não mediu nada.
import { useEffect, useState } from "react";
import { buscarUltimaLeitura } from "../api/potencia.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";

const INTERVALO_MS = 60 * 1000;

export default function useUltimaLeitura(aptoID, habilitado = true) {
  const [estado, setEstado] = useState({
    leitura: null,
    carregando: habilitado,
    erro: null,
  });

  useEffect(() => {
    if (!habilitado) {
      setEstado({ leitura: null, carregando: false, erro: null });
      return;
    }

    const controlador = new AbortController();

    async function carregar() {
      // App aberto em aba de fundo (ou PWA minimizado no celular) não precisa
      // ficar buscando: ninguém está olhando e a bateria é do usuário.
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const leitura = await buscarUltimaLeitura(aptoID, controlador.signal);
        if (controlador.signal.aborted) return;
        setEstado({ leitura, carregando: false, erro: null });
      } catch (err) {
        if (controlador.signal.aborted || err.name === "AbortError") return;
        console.error("Erro ao buscar última leitura:", err);
        setEstado({
          leitura: null,
          carregando: false,
          erro: mensagemAmigavel(err),
        });
      }
    }

    carregar();
    const timer = setInterval(carregar, INTERVALO_MS);

    return () => {
      controlador.abort();
      clearInterval(timer);
    };
  }, [aptoID, habilitado]);

  return estado;
}
