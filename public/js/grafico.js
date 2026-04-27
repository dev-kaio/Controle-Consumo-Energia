import { signOut, db } from "../auth/firebaseConfig.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const aptoSelecionado = urlParams.get("aptoID");

  let filtroAtualDisplay = "Desde o início";

  const btnLogout = document.getElementById("logout");
  btnLogout.addEventListener("click", Sair);

  async function Sair() {
    try {
      await signOut();
      localStorage.clear();
    } catch (error) {
      console.log("Erro ao deslogar.");
    }
  }

  const ctx = document.getElementById("meuGrafico").getContext("2d");

  let chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Consumo (kWh)",
          data: [],
          borderColor: "rgba(102, 6, 235, 0.7)",
          backgroundColor: "rgba(102, 6, 235, 0.7)",
          borderWidth: 3,
          fill: true,
        },
        {
          label: "Autoconsumo (kWh)",
          data: [],
          borderColor: "rgba(0, 166, 90)",
          backgroundColor: "rgba(0, 166, 90, 0.7)",
          borderWidth: 3,
          fill: true,
        },
        {
          label: "Geração (kWh)",
          data: [],
          borderColor: "rgba(243, 156, 18, 0.7)",
          backgroundColor: "rgba(243, 156, 18, 0.7)",
          borderWidth: 3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          labels: {
            font: {
              size: 16,
            },
          },
        },
      },
    },
  });

  let layoutAtual = "grafico";
  const divInquilinos = document.getElementById("inquilinoContainer");
  const divGrafico = document.getElementById("graficoContainer");

  function aplicarLayout() {
    if (layoutAtual === "grafico") {
      divGrafico.style.display = "block";
      divInquilinos.style.display = "none";
    } else {
      divGrafico.style.display = "none";
      divInquilinos.style.display = "block";
    }

    const menuInquilino = window.location.pathname.includes(
      "pages/menu-inquilino",
    );

    const btnTrocarDisposicao = document.getElementById("trocarDisposicao");

    if (menuInquilino) {
      btnTrocarDisposicao.style.display = "none";
    }
  }

  aplicarLayout();

  const trocarDisposicao = document.getElementById("trocarDisposicao");

  trocarDisposicao.addEventListener("click", () => {
    layoutAtual = layoutAtual === "grafico" ? "inquilinos" : "grafico";
    aplicarLayout();
  });

  async function buscarInquilinos() {
    const snapshot = await get(ref(db, "usuarios"));
    const usuarios = snapshot.val();

    if (!usuarios) return [];

    const inquilinos = [];

    for (const uid in usuarios) {
      const u = usuarios[uid];
      if (u.tipo === "inquilino" && u.ativo) {
          inquilinos.push({
            uid,
            nome: u.nome,
            aptoID: u.aptoID,
          });
      }
    }

    return inquilinos;
  }

  function agruparPorApartamento(dadosPorTipo) {
    const resultado = {};

    for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
      let dados = dadosPorTipo[tipo] || [];

      // garante array sempre
      if (!Array.isArray(dados)) {
        dados = Object.values(dados);
      }

      for (const item of dados) {
        const apto = item.aptoID;
        if (!apto) continue;

        if (!resultado[apto]) {
          resultado[apto] = {
            consumo: 0,
            autoconsumo: 0,
            geracao: 0,
          };
        }

        resultado[apto][tipo] += Number(item.valorKWh || 0);
      }
    }

    return resultado;
  }

  async function renderizarInquilinos(dadosPorTipo, filtroAtualDisplay) {
    const container = document.getElementById("inquilinoContainer");
    container.innerHTML = "";

    const totaisPorApto = agruparPorApartamento(dadosPorTipo);
    const inquilinos = await buscarInquilinos();

    for (const inq of inquilinos) {
      const totais = totaisPorApto[inq.aptoID] || {
        consumo: 0,
        autoconsumo: 0,
        geracao: 0,
      };

      const card = criarCardInquilino({
        apartamento: inq.aptoID || "Não definido",
        nome: inq.nome,
        consumo: totais.consumo,
        autoconsumo: totais.autoconsumo,
        geracao: totais.geracao,
        filtro: filtroAtualDisplay,
      });

      container.appendChild(card);
    }
  }

  function criarCardInquilino({
    apartamento,
    nome,
    consumo,
    autoconsumo,
    geracao,
    filtro,
  }) {
    const div = document.createElement("div");

    div.style.cssText = `
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    background: #f9f9f9;
  `;

    div.innerHTML = `
    <p><strong>Apartamento:</strong> ${apartamento.replace("apto_", "")}</p>
    <p><strong>Inquilino:</strong> ${nome}</p>

    <p><strong>Consumo (${filtro}):</strong>
      <span style="color:rgba(102, 6, 235, 0.7)">${consumo.toFixed(2)} kWh </span>
    </p>

    <p><strong>Autoconsumo (${filtro}):</strong> 
      <span style="color:rgba(0, 166, 90, 0.7)">${autoconsumo.toFixed(2)} kWh </span>
    </p>

    <p><strong>Geração (${filtro}): </strong>
      <span style="color:rgba(243, 156, 18, 0.7)">${geracao.toFixed(2)} kWh </span>
    </p>
  `;

    return div;
  }

  function atualizarGrafico(labels, dadosPorTipo) {
    chart.data.labels = labels;
    for (let i = 0; i < chart.data.datasets.length; i++) {
      chart.data.datasets[i].data = dadosPorTipo[i] || [];
    }
    console.log(labels);
    console.log(dadosPorTipo);
    chart.update();
  }

  // Determina se deve usar barras baseado no filtro ou agrupamento
  function deveUsarBarras(filtro, agrupamento) {
    // Barras para filtros: semana, mes, ano, inicio
    if (filtro && ["semana", "mes", "ano", "inicio"].includes(filtro)) {
      return true;
    }
    // Barras para agrupamentos: dia, mes, ano
    if (agrupamento && ["dia", "mes", "ano"].includes(agrupamento)) {
      return true;
    }
    // Linha para: hora, dia (filtro), raw
    return false;
  }

  // Muda o tipo do gráfico se necessário
  function ajustarTipoGrafico(tipo, labels, dadosPorTipo) {
    if (chart.config.type === tipo) {
      // Tipo já está correto, só atualiza os dados
      return;
    }

    // Prepara os datasets com os novos dados
    const novosDatasets = chart.data.datasets.map((ds, idx) => ({
      label: ds.label,
      data: dadosPorTipo[idx] || [],
      borderColor: ds.borderColor,
      backgroundColor: ds.backgroundColor,
      borderWidth: tipo === "bar" ? 2 : 3,
      fill: ds.fill,
    }));

    // Destrói e recria o gráfico com o novo tipo e dados
    chart.destroy();
    chart = new Chart(ctx, {
      type: tipo,
      data: {
        labels: labels,
        datasets: novosDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              minRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            labels: {
              font: {
                size: 16,
              },
            },
          },
        },
      },
    });
  }

  function atualizarMediaConsumo(medias, filtroDisplay) {
    const tipos = ["consumo", "autoconsumo", "geracao"];

    tipos.forEach((tipo) => {
      const titulo = document.getElementById(
        `tituloMedia${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
      );
      const valor = document.getElementById(
        `valorMedia${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
      );

      if (!titulo || !valor) return;

      titulo.innerHTML = `Média de ${
        tipo.charAt(0).toUpperCase() + tipo.slice(1)
      }:<br> ${filtroDisplay}`;
      if (medias[tipo] !== undefined && medias[tipo] !== null) {
        valor.textContent = medias[tipo]
          ? `${medias[tipo].toFixed(2)} kWh`
          : "--";
      } else {
        valor.textContent = "--";
      }
    });
  }

  function agruparDados(data, tipo) {
    const grupos = {};

    data.forEach((item) => {
      const d = new Date(item.timestamp);
      let chave;

      switch (tipo) {
        case "ano":
          chave = String(d.getFullYear());
          break;
        case "mes":
          chave = `${String(d.getMonth() + 1).padStart(
            2,
            "0",
          )}/${d.getFullYear()}`;
          break;
        case "dia":
          chave = d.toLocaleDateString("pt-BR");
          break;
        case "hora":
          chave = `${String(d.getHours()).padStart(2, "0")}h`;
          break;
        default:
          chave = d.toLocaleString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          });
      }

      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item.valorKWh);
    });

    // Ordena as labels corretamente (convertendo para Date no formato dd/mm/yyyy ou mm/yyyy)
    const labels = Object.keys(grupos).sort((a, b) => {
      // tenta parsear d/m/y para Date, senão compara string normal
      const parseLabel = (label) => {
        // Se for apenas um número (ano), trata como ano
        if (/^\d{4}$/.test(label)) {
          return new Date(parseInt(label), 0, 1);
        }
        const parts = label.split(/[\/h]/);
        if (parts.length === 3) {
          // dia/mes/ano
          return new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (parts.length === 2) {
          // mes/ano
          return new Date(parts[1], parts[0] - 1);
        } else if (label.endsWith("h")) {
          // só hora, não dá para ordenar por data, deixa como está
          return label;
        } else {
          return new Date(label);
        }
      };
      const da = parseLabel(a);
      const db = parseLabel(b);

      if (da instanceof Date && db instanceof Date) return da - db;
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    });

    const consumos = labels.map((label) => {
      // Garante acesso consistente ao objeto grupos
      const chave = String(label);
      return grupos[chave]
        ? grupos[chave].reduce((acc, val) => acc + val, 0)
        : 0;
    });

    return { labels, consumos };
  }

  function calcularAgrupamentoAuto(inicioStr, fimStr) {
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    const diffDias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));

    if (diffDias >= 730) return "ano";
    if (diffDias >= 60) return "mes";
    if (diffDias >= 2) return "dia";
    if (diffDias >= 0) return "hora";
    return "raw";
  }

  function getTiposSelecionados() {
    return Array.from(
      document.querySelectorAll("#tipoSelecionado input:checked"),
    ).map((cb) => cb.value);
  }

  async function buscarDadosSeparados(
    params,
    tiposSelecionados = getTiposSelecionados(),
  ) {
    const tipoParaEndpoint = {
      consumo: "consumo",
      autoconsumo: "autoconsumo",
      geracao: "geracao",
    };

    const dadosTotais = {};
    const token = localStorage.getItem("token");

    for (let tipo of tiposSelecionados) {
      const url = `/firebase/${tipoParaEndpoint[tipo]}?${new URLSearchParams(
        params,
      ).toString()}`;

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Erro ao buscar ${tipo}`);
        }

        const data = await response.json();
        dadosTotais[tipo] = Array.isArray(data)
          ? data
          : Object.values(data || {});
      } catch (err) {
        console.error(`Erro ao buscar ${tipo}:`, err);
        dadosTotais[tipo] = [];
      }
    }

    return dadosTotais;
  }

  async function buscarDados(params) {
    // Se veio apto pela URL, ele tem prioridade absoluta
    if (aptoSelecionado) {
      params.aptoID = aptoSelecionado;
    }

    const tiposSelecionados = getTiposSelecionados();

    const dadosPorTipo = await buscarDadosSeparados(params, tiposSelecionados);

    // Agrupamento e filtroDisplay
    let agrupamento = "raw";
    let filtroDisplay = "intervalo selecionado";

    if (params.filtro) {
      const mapFiltros = {
        hora: { nome: "Última Hora", agrupamento: "hora" },
        dia: { nome: "Hoje", agrupamento: "hora" },
        semana: { nome: "Última Semana", agrupamento: "dia" },
        mes: { nome: "Último Mês", agrupamento: "dia" },
        ano: { nome: "Último Ano", agrupamento: "mes" },
        inicio: { nome: "Desde o Início", agrupamento: "ano" },
      };
      const info = mapFiltros[params.filtro] || {};
      filtroDisplay = info.nome || "intervalo selecionado";
      agrupamento = info.agrupamento || "raw";
    } else if (params.inicio && params.fim) {
      filtroDisplay = `${new Date(
        params.inicio,
      ).toLocaleDateString()} até ${new Date(params.fim).toLocaleDateString()}`;
      agrupamento = calcularAgrupamentoAuto(params.inicio, params.fim);
    }

    filtroAtualDisplay = filtroDisplay;

    // Determina o tipo de gráfico baseado nos parâmetros
    const tipoGrafico = deveUsarBarras(params.filtro, agrupamento)
      ? "bar"
      : "line";

    // Vamos montar labels comuns a todos os datasets, para alinhar os dados
    let todosLabels = new Set();

    // Primeiro: para cada tipo selecionado, pega os labels agrupados ou raw
    const dadosAgrupadosPorTipo = {};

    for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
      if (!tiposSelecionados.includes(tipo)) {
        dadosAgrupadosPorTipo[tipo] = { labels: [], consumos: [] };
        continue;
      }

      let dados = dadosPorTipo[tipo] || [];

      if (!Array.isArray(dados)) {
        dados = Object.entries(dados).map(([timestamp, valor]) => ({
          timestamp,
          valor,
        }));
      }

      if (agrupamento === "raw" || agrupamento === "hora") {
        // Labels formados direto da data
        const labelsTipo = dados.map((item) =>
          new Date(item.timestamp).toLocaleString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
        );
        const consumosTipo = dados.map((item) => item.valorKWh);

        dadosAgrupadosPorTipo[tipo] = {
          labels: labelsTipo,
          consumos: consumosTipo,
        };

        labelsTipo.forEach((l) => todosLabels.add(l));
      } else {
        // Converte caso seja um objeto de pares chave-valor
        const dadosArray = Array.isArray(dados)
          ? dados
          : Object.entries(dados).map(([timestamp, valor]) => ({
              timestamp,
              valor,
            }));

        const agrupado = agruparDados(dadosArray, agrupamento);

        dadosAgrupadosPorTipo[tipo] = agrupado;
        agrupado.labels.forEach((l) => todosLabels.add(l));
      }
    }

    // Converte set para array e ordena para garantir ordem temporal
    const labelsOrdenados = Array.from(todosLabels).sort((a, b) => {
      // Função para parsear labels de diferentes formatos
      const parseLabel = (label) => {
        // Se for apenas um número (ano), trata como ano
        if (/^\d{4}$/.test(label)) {
          return new Date(parseInt(label), 0, 1);
        }
        const parts = label.split(/[\/h]/);
        if (parts.length === 3) {
          // dia/mes/ano
          return new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (parts.length === 2 && !label.endsWith("h")) {
          // mes/ano
          return new Date(parts[1], parts[0] - 1);
        } else if (label.endsWith("h")) {
          // hora
          const hora = parseInt(label.replace("h", ""));
          return new Date(2000, 0, 1, hora);
        }
        const parsed = new Date(label);
        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
      };

      const da = parseLabel(a);
      const db = parseLabel(b);

      if (da instanceof Date && db instanceof Date) {
        return da - db;
      }
      return String(a).localeCompare(String(b));
    });

    // Para cada tipo, monta array com valores alinhados ao labelsOrdenados (0 quando não tem)
    const datasets = [];

    for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
      if (!tiposSelecionados.includes(tipo)) {
        datasets.push([]);
        continue;
      }

      const { labels, consumos } = dadosAgrupadosPorTipo[tipo];
      const mapLabelParaConsumo = {};
      labels.forEach((lab, idx) => {
        const chave = String(lab);
        mapLabelParaConsumo[chave] = consumos[idx];
      });

      const valoresAlinhados = labelsOrdenados.map((lab) => {
        const chave = String(lab);
        return mapLabelParaConsumo[chave] || 0;
      });

      datasets.push(valoresAlinhados);
    }

    // Ajusta o tipo do gráfico se necessário (com os dados já processados)
    ajustarTipoGrafico(tipoGrafico, labelsOrdenados, datasets);

    // Se o tipo não mudou, apenas atualiza os dados
    if (chart.config.type === tipoGrafico) {
      atualizarGrafico(labelsOrdenados, datasets);
    }

    // Calcula médias para cada tipo (sem considerar zeros)
    const medias = {};

    //----------------------------------------------------------------------------------
    //
    //  CÁLCULO DA MÉDIA - EXPLICAÇÃO
    //
    //  Como funciona atualmente:
    //  - O código filtra apenas valores MAIORES que 0 (dadosValidos = dados.filter(v => v > 0))
    //  - A média é calculada: soma / quantidade de dias com dados
    //
    //  Exemplo: Mês de 30 dias, mas só 5 dias têm leitura
    //  - Leituras: [1.2, 1.5, 2.1, 1.8, 2.3] kWh
    //  - Média atual: (1.2+1.5+2.1+1.8+2.3) / 5 = 1.78 kWh/dia
    //
    //  Caso que pode gerar PROBLEMA:
    //  - Se o ESP32 não enviou dados em alguns dias (por estar offline, sem energia, etc.)
    //  - A média será calculada SEM considerar esses dias como 0
    //  - Isso pode SUPERESTIMAR o consumo médio real
    //
    //  Alternativas possíveis:
    //  1. Manter assim (média por dia COM dados) - atual
    //  2. Dividir pelo total de dias do período (incluindo zeros)
    //  3. Considerar dias úteis apenas
    //
    //----------------------------------------------------------------------------------

    for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
      if (!tiposSelecionados.includes(tipo)) {
        medias[tipo] = null;
        continue;
      }

      const dados =
        datasets[["consumo", "autoconsumo", "geracao"].indexOf(tipo)];
      // Filtra zeros para não contar quando não tem
      const dadosValidos = dados.filter((v) => v > 0);
      const soma = dadosValidos.reduce((acc, val) => acc + val, 0);
      medias[tipo] = dadosValidos.length ? soma / dadosValidos.length : 0;
    }

    atualizarMediaConsumo(medias, filtroDisplay);

    // se for escalar, precisa considerar impacto na performance caso tenha grande volume de inquilinos e dados
    await renderizarInquilinos(dadosPorTipo, filtroAtualDisplay);

    return {
      dadosPorTipo,
      datasets,
      labelsOrdenados,
      filtroDisplay,
    };
  }

  // Filtros
  document
    .querySelectorAll(".filter-menu button[data-filter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const filtro = button.getAttribute("data-filter");
        buscarDados({ filtro }).then(aplicarLayout);
        document.getElementById("filterMenu").style.display = "none";
      });
    });

  document.getElementById("aplicarIntervalo").addEventListener("click", () => {
    const inicio = document.getElementById("inicioFiltro").value;
    const fim = document.getElementById("fimFiltro").value;
    if (!inicio || !fim) {
      alert("Preencha as duas datas.");
      return;
    }

    buscarDados({ inicio, fim }).then(aplicarLayout);
    document.getElementById("filterMenu").style.display = "none";
  });

  // Atualizar gráfico quando o usuário marcar/desmarcar os checkboxes
  document
    .querySelectorAll('#tipoSelecionado input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        // Recarregar os dados com os tipos selecionados atuais
        buscarDados({ filtro: "inicio" }).then(aplicarLayout); // ou o filtro que desejar ao reiniciar
      });
    });

  // Carregar dados iniciais com filtro 'inicio' e todos os tipos selecionados
  buscarDados({ filtro: "inicio" }).then(aplicarLayout);
});
