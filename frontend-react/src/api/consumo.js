// Leituras de energia — GET /firebase/{consumo|autoconsumo|geracao}.
// params: { filtro } OU { inicio, fim }, + aptoID opcional.
// O backend pode devolver array ou objeto — normalizamos pra array.
import { apiGet } from "./http.js";

export async function buscarLeituras(tipo, params, signal) {
  const query = new URLSearchParams(params).toString();
  const dados = await apiGet(`/firebase/${tipo}?${query}`, { signal });
  return Array.isArray(dados) ? dados : Object.values(dados || {});
}

// Busca os tipos selecionados em paralelo. Um tipo que falhar vira
// lista vazia (o gráfico continua com os outros — igual ao app antigo).
// O signal cancela as requisições quando o filtro muda no meio delas.
export async function buscarLeiturasPorTipo(tipos, params, signal) {
  const resultados = await Promise.all(
    tipos.map(async (tipo) => {
      try {
        return [tipo, await buscarLeituras(tipo, params, signal)];
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(`Erro ao buscar ${tipo}:`, err);
        }
        return [tipo, []];
      }
    }),
  );
  return Object.fromEntries(resultados);
}
