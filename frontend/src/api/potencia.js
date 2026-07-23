// Leitura mais recente de um apartamento — GET /firebase/ultima-leitura.
//
// Existe separado de api/consumo.js porque as rotas de série histórica
// (/firebase/consumo etc.) devolvem só {timestamp, valorKWh}: a potência que
// a ESP grava não passa por elas. Ver docs/FIRMWARE.md.
//
// Sem aptoID, o backend resolve pelo token — é o caso do inquilino.
import { apiGet } from "./http.js";

export function buscarUltimaLeitura(aptoID, signal) {
  const query = aptoID ? `?aptoID=${encodeURIComponent(aptoID)}` : "";
  return apiGet(`/firebase/ultima-leitura${query}`, { signal });
}
