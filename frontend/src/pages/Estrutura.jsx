// Gestão da estrutura física (rota /estrutura, admin e superadmin).
// Recarga seletiva: criar condomínio/prédio/apto recarrega a estrutura;
// cadastrar medidor recarrega só a lista de medidores.
//
// Os painéis vivem em ABAS, não empilhados: com mil apartamentos, uma página
// com todas as seções abertas ao mesmo tempo fica impossível de usar (e de
// renderizar). Só a aba ativa existe no DOM — quem controla qual é a URL
// (?aba=), o que também permite o tour guiado navegar até cada painel.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  listarCondominios,
  listarApartamentos,
  listarDispositivos,
} from "../api/estrutura.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";
import MsgFeedback from "../components/ui/MsgFeedback.jsx";
import Abas from "../components/ui/Abas.jsx";
import PainelCondominio from "../components/estrutura/PainelCondominio.jsx";
import PainelPredios from "../components/estrutura/PainelPredios.jsx";
import PainelApartamentos from "../components/estrutura/PainelApartamentos.jsx";
import PainelMedidores from "../components/estrutura/PainelMedidores.jsx";
import PainelTarifas from "../components/estrutura/PainelTarifas.jsx";

export default function Estrutura() {
  const { role } = useAuth();
  const souSuperadmin = role === "superadmin";

  const [condominios, setCondominios] = useState({});
  const [apartamentos, setApartamentos] = useState({});
  const [dispositivos, setDispositivos] = useState({});
  // Falha de carga não pode ser silenciosa: sem isso a tela fica vazia e o
  // usuário conclui que "não tem nada cadastrado" em vez de "deu erro".
  const [erroCarga, setErroCarga] = useState(null);

  const carregarEstrutura = useCallback(async () => {
    try {
      const [condos, aptos] = await Promise.all([
        listarCondominios(),
        listarApartamentos(),
      ]);
      setCondominios(condos);
      setApartamentos(aptos);
      setErroCarga(null);
    } catch (err) {
      console.error("Erro ao carregar estrutura:", err);
      setErroCarga({ texto: mensagemAmigavel(err), ok: false });
    }
  }, []);

  const carregarDispositivos = useCallback(async () => {
    try {
      setDispositivos(await listarDispositivos());
    } catch (err) {
      console.error("Erro ao carregar dispositivos:", err);
      setErroCarga({ texto: mensagemAmigavel(err), ok: false });
    }
  }, []);

  useEffect(() => {
    carregarEstrutura();
    carregarDispositivos();
  }, [carregarEstrutura, carregarDispositivos]);

  return (
    <>
      <span className="section-title">Estrutura</span>

      <MsgFeedback msg={erroCarga} />

      {/* A ordem das abas é a ordem de cadastro: condomínio → prédio →
          apartamento → medidor. Aba com conteudo nulo o Abas ignora. */}
      <Abas
        abas={[
          {
            id: "condominios",
            rotulo: "Condomínios",
            conteudo: souSuperadmin ? (
              <PainelCondominio aoCriar={carregarEstrutura} />
            ) : null,
          },
          {
            id: "predios",
            rotulo: "Prédios",
            conteudo: (
              <PainelPredios
                condominios={condominios}
                souSuperadmin={souSuperadmin}
                aoCriar={carregarEstrutura}
              />
            ),
          },
          {
            id: "apartamentos",
            rotulo: "Apartamentos",
            conteudo: (
              <PainelApartamentos
                condominios={condominios}
                apartamentos={apartamentos}
                souSuperadmin={souSuperadmin}
                aoCriar={carregarEstrutura}
              />
            ),
          },
          {
            id: "medidores",
            rotulo: "Medidores",
            conteudo: (
              <PainelMedidores
                apartamentos={apartamentos}
                dispositivos={dispositivos}
                aoCriar={carregarDispositivos}
              />
            ),
          },
          {
            id: "tarifas",
            rotulo: "Tarifas",
            conteudo: souSuperadmin ? (
              <PainelTarifas condominios={condominios} />
            ) : null,
          },
        ]}
      />
    </>
  );
}
