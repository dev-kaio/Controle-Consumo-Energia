// Gestão da estrutura física (rota /estrutura, admin e superadmin).
// Recarga seletiva: criar condomínio/prédio/apto recarrega a estrutura;
// cadastrar medidor recarrega só a lista de medidores.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  listarCondominios,
  listarApartamentos,
  listarDispositivos,
} from "../api/estrutura.js";
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

  const carregarEstrutura = useCallback(async () => {
    try {
      const [condos, aptos] = await Promise.all([
        listarCondominios(),
        listarApartamentos(),
      ]);
      setCondominios(condos);
      setApartamentos(aptos);
    } catch (err) {
      console.error("Erro ao carregar estrutura:", err);
    }
  }, []);

  const carregarDispositivos = useCallback(async () => {
    try {
      setDispositivos(await listarDispositivos());
    } catch (err) {
      console.error("Erro ao carregar dispositivos:", err);
    }
  }, []);

  useEffect(() => {
    carregarEstrutura();
    carregarDispositivos();
  }, [carregarEstrutura, carregarDispositivos]);

  return (
    <>
      <span className="section-title">Estrutura</span>

      {souSuperadmin && <PainelCondominio aoCriar={carregarEstrutura} />}

      <PainelPredios
        condominios={condominios}
        souSuperadmin={souSuperadmin}
        aoCriar={carregarEstrutura}
      />

      <PainelApartamentos
        condominios={condominios}
        apartamentos={apartamentos}
        souSuperadmin={souSuperadmin}
        aoCriar={carregarEstrutura}
      />

      <PainelMedidores
        apartamentos={apartamentos}
        dispositivos={dispositivos}
        aoCriar={carregarDispositivos}
      />

      {souSuperadmin && <PainelTarifas condominios={condominios} />}
    </>
  );
}
