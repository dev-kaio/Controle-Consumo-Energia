// Hook de dados do dashboard: busca as leituras dos tipos selecionados,
// agrega e devolve tudo pronto pra plotar.
//
// consulta = { filtro: "hora"|"dia"|... }  OU  { inicio, fim }  (+ aptoID?)
// Devolve { labels, series, medias, dadosBrutos, agrupamento, nomeFiltro,
//           carregando, erro }
//
// AbortController no cleanup: em dev o StrictMode roda o efeito 2x e o
// usuário troca de filtro rápido — abortar garante que resposta velha
// nunca sobrescreve a nova.
import { useEffect, useState } from "react";
import { buscarLeiturasPorTipo } from "../api/consumo.js";
import { mensagemAmigavel } from "../utils/mensagensErro.js";
import {
  agruparPorPeriodo,
  alinharSeries,
  calcularMedia,
  agrupamentoAutomatico,
} from "../utils/agregacao.js";
import { rotuloDoPeriodo, FILTROS } from "../utils/formatos.js";

const TIPOS = ["consumo", "autoconsumo", "geracao"];

export default function useConsumo(consultaObj, tiposObj) {
  // O efeito depende do CONTEÚDO (string), não da identidade do objeto —
  // um objeto novo com o mesmo conteúdo não dispara refetch à toa.
  const chaveConsulta = JSON.stringify(consultaObj);
  const chaveTipos = JSON.stringify(tiposObj);

  const [estado, setEstado] = useState({
    labels: [],
    series: { consumo: [], autoconsumo: [], geracao: [] },
    medias: { consumo: null, autoconsumo: null, geracao: null },
    dadosBrutos: {},
    agrupamento: "raw",
    nomeFiltro: "",
    carregando: true,
    erro: null,
  });

  useEffect(() => {
    const controlador = new AbortController();
    const consulta = JSON.parse(chaveConsulta);
    const tiposSelecionados = JSON.parse(chaveTipos);

    async function carregar() {
      setEstado((e) => ({ ...e, carregando: true, erro: null }));

      // Nome de exibição + agrupamento vêm do filtro (ou do tamanho do
      // intervalo custom)
      let agrupamento = "raw";
      let nomeFiltro = "intervalo selecionado";
      const params = {};

      if (consulta.filtro) {
        const info = FILTROS[consulta.filtro] || {};
        nomeFiltro = info.nome || nomeFiltro;
        agrupamento = info.agrupamento || "raw";
        params.filtro = consulta.filtro;
      } else if (consulta.inicio && consulta.fim) {
        agrupamento = agrupamentoAutomatico(consulta.inicio, consulta.fim);
        nomeFiltro = `${new Date(consulta.inicio).toLocaleDateString("pt-BR")} até ${new Date(consulta.fim).toLocaleDateString("pt-BR")}`;
        params.inicio = consulta.inicio;
        params.fim = consulta.fim;
      }
      if (consulta.aptoID) params.aptoID = consulta.aptoID;

      try {
        const { porTipo: dadosBrutos, falhas } = await buscarLeiturasPorTipo(
          tiposSelecionados,
          params,
          controlador.signal,
        );
        if (controlador.signal.aborted) return;

        // Falhou um tipo só? o gráfico segue com os outros, sem alarde.
        // Falharam todos? não há nada pra desenhar — aí o usuário precisa
        // saber por quê, senão lê a tela vazia como "não tenho consumo".
        const tudoFalhou =
          falhas.length > 0 && falhas.length === tiposSelecionados.length;

        // Agrega cada tipo e alinha tudo num eixo comum
        const mapas = {};
        for (const tipo of TIPOS) {
          mapas[tipo] = agruparPorPeriodo(dadosBrutos[tipo] || [], agrupamento);
        }
        const { chaves, series } = alinharSeries(mapas);

        const medias = {};
        for (const tipo of TIPOS) {
          medias[tipo] = tiposSelecionados.includes(tipo)
            ? calcularMedia(series[tipo])
            : null;
        }

        setEstado({
          labels: chaves.map((c) => rotuloDoPeriodo(c, agrupamento)),
          series,
          medias,
          dadosBrutos,
          agrupamento,
          nomeFiltro,
          carregando: false,
          erro: tudoFalhou ? mensagemAmigavel(falhas[0]) : null,
        });
      } catch (err) {
        if (controlador.signal.aborted) return;
        console.error("Erro ao carregar consumo:", err);
        setEstado((e) => ({ ...e, carregando: false, erro: mensagemAmigavel(err) }));
      }
    }

    carregar();
    return () => controlador.abort();
  }, [chaveConsulta, chaveTipos]);

  return estado;
}
