import { signOut } from "../auth/firebaseConfig.js";

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
        label: "Consumo (Watts)",
        data: [],
        borderColor: "rgba(102, 6, 235, 0.7)",
        borderWidth: 6,
        fill: true,
      },
      {
        label: "Autoconsumo (Watts)",
        data: [],
        borderColor: "rgba(0, 166, 90, 0.7)",
        borderWidth: 6,
        fill: true,
      },
      {
        label: "Geração (Watts)",
        data: [],
        borderColor: "rgba(243, 156, 18, 0.7)",
        borderWidth: 6,
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
          maxRotation: 45,
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
            size: 14,
          },
        },
      },
    },
  },
});

function atualizarGrafico(labels, dadosPorTipo) {
  chart.data.labels = labels;
  for (let i = 0; i < chart.data.datasets.length; i++) {
    chart.data.datasets[i].data = dadosPorTipo[i] || [];
  }
  chart.update();
}

function atualizarMediaConsumo(medias, filtroDisplay) {
  // medias: objeto { consumo: number, autoconsumo: number, geracao: number }
  // Atualiza as médias de cada tipo na tela

  // Assumindo que você tenha 3 divs, uma pra cada tipo, com esses IDs:
  // mediaConsumo, mediaAutoconsumo, mediaGeracao
  const tipos = ["consumo", "autoconsumo", "geracao"];

  tipos.forEach((tipo) => {
    const titulo = document.getElementById(`tituloMedia${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    const valor = document.getElementById(`valorMedia${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);

    if (!titulo || !valor) return;

    titulo.innerHTML = `Média de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}:<br> ${filtroDisplay}`;
    if (medias[tipo] !== undefined && medias[tipo] !== null) {
      valor.textContent = medias[tipo] ? `${medias[tipo].toFixed(2)} Watts` : "--";
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
        chave = d.getFullYear();
        break;
      case "mes":
        chave = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
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
    grupos[chave].push(item.consumo);
  });

  // Ordena as labels corretamente (convertendo para Date no formato dd/mm/yyyy ou mm/yyyy)
  const labels = Object.keys(grupos).sort((a, b) => {
    // tenta parsear d/m/y para Date, senão compara string normal
    const parseLabel = (label) => {
      const parts = label.split(/[\/h]/);
      if (parts.length === 3) {
        // dia/mes/ano
        return new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (parts.length === 2) {
        // mes/ano
        return new Date(parts[1], parts[0] - 1);
      } else if (label.endsWith('h')) {
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

  const consumos = labels.map((label) =>
    grupos[label].reduce((acc, val) => acc + val, 0)
  );

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
  return Array.from(document.querySelectorAll('#tipoSelecionado input:checked')).map(cb => cb.value);
}

async function buscarDadosSeparados(params, tiposSelecionados = getTiposSelecionados()) {
  const tipoParaEndpoint = {
    consumo: "consumo",
    autoconsumo: "autoconsumo",
    geracao: "geracao",
  };

  const dadosTotais = {};
  const token = localStorage.getItem("token");

  for (let tipo of tiposSelecionados) {
    const endpoint = tipoParaEndpoint[tipo];
    const queryString = new URLSearchParams(params).toString();
    const url = `/firebase/${endpoint}?${queryString}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Erro ao buscar ${tipo}`);
      const data = await response.json();
      dadosTotais[tipo] = data;
    } catch (err) {
      console.error(err);
      dadosTotais[tipo] = [];
    }
  }

  return dadosTotais;
}

async function buscarDados(params) {
  const tipoUsuario = localStorage.getItem("tipoUsuario");
  const apartamentoId = localStorage.getItem("apartamentoId");

  if (tipoUsuario === "inquilino" && apartamentoId) {
    params.apartamentoId = apartamentoId;
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
    filtroDisplay = `${new Date(params.inicio).toLocaleDateString()} até ${new Date(params.fim).toLocaleDateString()}`;
    agrupamento = calcularAgrupamentoAuto(params.inicio, params.fim);
  }

  // Vamos montar labels comuns a todos os datasets, para alinhar os dados
  let todosLabels = new Set();

  // Primeiro: para cada tipo selecionado, pega os labels agrupados ou raw
  const dadosAgrupadosPorTipo = {};

  for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
    if (!tiposSelecionados.includes(tipo)) {
      dadosAgrupadosPorTipo[tipo] = { labels: [], consumos: [] };
      continue;
    }

    const dados = dadosPorTipo[tipo] || [];

    if (agrupamento === "raw" || agrupamento === "hora") {
      // Labels formados direto da data
      const labelsTipo = dados.map((item) =>
        new Date(item.timestamp).toLocaleString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      );
      const consumosTipo = dados.map((item) => item.consumo);

      dadosAgrupadosPorTipo[tipo] = { labels: labelsTipo, consumos: consumosTipo };

      labelsTipo.forEach(l => todosLabels.add(l));
    } else {
      const agrupado = agruparDados(dados, agrupamento);
      dadosAgrupadosPorTipo[tipo] = agrupado;
      agrupado.labels.forEach(l => todosLabels.add(l));
    }
  }

  // Converte set para array e ordena para garantir ordem temporal
  const labelsOrdenados = Array.from(todosLabels).sort((a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return da - db;
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
      mapLabelParaConsumo[lab] = consumos[idx];
    });

    const valoresAlinhados = labelsOrdenados.map((lab) => mapLabelParaConsumo[lab] || 0);
    datasets.push(valoresAlinhados);
  }

  atualizarGrafico(labelsOrdenados, datasets);

  // Calcula médias para cada tipo (sem considerar zeros)
  const medias = {};

  for (const tipo of ["consumo", "autoconsumo", "geracao"]) {
    if (!tiposSelecionados.includes(tipo)) {
      medias[tipo] = null;
      continue;
    }

    const dados = datasets[["consumo", "autoconsumo", "geracao"].indexOf(tipo)];
    // Filtra zeros para não contar quando não tem
    const dadosValidos = dados.filter((v) => v > 0);
    const soma = dadosValidos.reduce((acc, val) => acc + val, 0);
    medias[tipo] = dadosValidos.length ? soma / dadosValidos.length : 0;
  }

  atualizarMediaConsumo(medias, filtroDisplay);
}

// Filtros
document.querySelectorAll(".filter-menu button[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const filtro = button.getAttribute("data-filter");
    buscarDados({ filtro });
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

  buscarDados({ inicio, fim });
  document.getElementById("filterMenu").style.display = "none";
});

// Atualizar gráfico quando o usuário marcar/desmarcar os checkboxes
document.querySelectorAll('#tipoSelecionado input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    // Recarregar os dados com os tipos selecionados atuais
    buscarDados({ filtro: "inicio" }); // ou o filtro que desejar ao reiniciar
  });
});

// Carregar dados iniciais com filtro 'inicio' e todos os tipos selecionados
buscarDados({ filtro: "inicio" });






// import { signOut } from "../auth/firebaseConfig.js";

// const btnLogout = document.getElementById("logout");
// btnLogout.addEventListener("click", Sair);

// async function Sair() {
//   try {
//     await signOut();
//     //Limpar localSotrage
//     //Controle de session e desativar token
//   } catch (error) {
//     console.log("Erro ao deslogar.");
//   }
// }

// const ctx = document.getElementById("meuGrafico").getContext("2d");

// let chart = new Chart(ctx, {
//   type: "bar",
//   data: {
//     labels: [],
//     datasets: [
//       {
//         label: "Consumo (em Watts)",
//         data: [],
//         backgroundColor: "rgb(102, 6, 235)",
//       },
//     ],
//   },
//   options: {
//     responsive: true,
//     maintainAspectRatio: false,
//     scales: {
//       x: {
//         ticks: {
//           maxRotation: 45,
//           minRotation: 0,
//         },
//       },
//       y: {
//         beginAtZero: true,
//       },
//     },
//     plugins: {
//       legend: {
//         labels: {
//           font: {
//             size: 14,
//           },
//         },
//       },
//     },
//   },
// });

// function atualizarGrafico(labels, dados) {
//   chart.data.labels = labels;
//   chart.data.datasets[0].data = dados;
//   chart.update();
// }

// function atualizarMediaConsumo(media, filtroDisplay) {
//   const titulo = document.getElementById("tituloMediaConsumo");
//   const valor = document.getElementById("valorMediaConsumo");

//   titulo.innerHTML = `Média de Consumo:<br> ${filtroDisplay}`;
//   valor.textContent = media ? `${media.toFixed(2)} Watts` : "--";
// }

// function agruparDados(data, tipo) {
//   const grupos = {};

//   data.forEach((item) => {
//     const d = new Date(item.timestamp);
//     let chave;

//     switch (tipo) {
//       case "ano":
//         chave = d.getFullYear();
//         break;
//       case "mes":
//         chave = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
//         break;
//       case "dia":
//         chave = d.toLocaleDateString("pt-BR");
//         break;
//       case "hora":
//         chave = `${String(d.getHours()).padStart(2, "0")}h`;
//         break;
//       case "diaSemana":
//         chave = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
//         break;
//       default:
//         chave = d.toLocaleString("pt-BR", {
//           hour: "2-digit",
//           minute: "2-digit",
//           day: "2-digit",
//           month: "2-digit",
//         });
//     }

//     if (!grupos[chave]) grupos[chave] = [];
//     grupos[chave].push(item.consumo);
//   });

//   const labels = Object.keys(grupos).sort((a, b) => {
//     return new Date("01/" + a) - new Date("01/" + b); // funciona para mes/ano e dia
//   });

//   const consumos = labels.map((label) =>
//     grupos[label].reduce((acc, val) => acc + val, 0)
//   );

//   return { labels, consumos };
// }

// function calcularAgrupamentoAuto(inicioStr, fimStr) {
//   const inicio = new Date(inicioStr);
//   const fim = new Date(fimStr);
//   const diffDias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));

//   if (diffDias >= 730) return "ano";
//   if (diffDias >= 60) return "mes";
//   if (diffDias >= 2) return "dia";
//   if (diffDias >= 0) return "hora";
//   return "raw";
// }

// async function buscarDados(params) {
//   try {
//     const queryString = new URLSearchParams(params).toString();
//     const response = await fetch(`/firebase/consumo?${queryString}`);

//     if (!response.ok) throw new Error("Erro ao buscar dados");

//     const data = await response.json();

//     if (!data || data.length === 0) {
//       alert("Nenhum dado encontrado no intervalo selecionado.");
//       atualizarGrafico([], []);
//       atualizarMediaConsumo(null, "intervalo selecionado");
//       return;
//     }

//     let agrupamento = "raw"; // default
//     let filtroDisplay = "intervalo selecionado";

//     if (params.filtro) {
//       const mapFiltros = {
//         hora: { nome: "Última Hora", agrupamento: "hora" },
//         dia: { nome: "Hoje", agrupamento: "hora" },
//         semana: { nome: "Última Semana", agrupamento: "dia" },
//         mes: { nome: "Último Mês", agrupamento: "dia" },
//         ano: { nome: "Último Ano", agrupamento: "mes" },
//         inicio: { nome: "Desde o Início", agrupamento: "ano" },
//       };
//       const info = mapFiltros[params.filtro] || {};
//       filtroDisplay = info.nome || "intervalo selecionado";
//       agrupamento = info.agrupamento || "raw";
//     } else if (params.inicio && params.fim) {
//       filtroDisplay = `${new Date(params.inicio).toLocaleDateString()} até ${new Date(params.fim).toLocaleDateString()}`;
//       agrupamento = calcularAgrupamentoAuto(params.inicio, params.fim);
//     }

//     let labels, consumos;
//     if (agrupamento === "raw" || agrupamento === "hora") {
//       labels = data.map((item) =>
//         new Date(item.timestamp).toLocaleString("pt-BR", {
//           hour: "2-digit",
//           minute: "2-digit",
//           day: "2-digit",
//           month: "2-digit",
//         })
//       );
//       consumos = data.map((item) => item.consumo);
//     } else {
//       const agrupado = agruparDados(data, agrupamento);
//       labels = agrupado.labels;
//       consumos = agrupado.consumos;
//     }

//     atualizarGrafico(labels, consumos);

//     const soma = consumos.reduce((acc, val) => acc + val, 0);
//     const media = soma / consumos.length;

//     atualizarMediaConsumo(media, filtroDisplay);
//   } catch (err) {
//     console.error(err);
//     alert("Erro ao carregar os dados");
//   }
// }

// document.querySelectorAll(".filter-menu button[data-filter]").forEach((button) => {
//   button.addEventListener("click", () => {
//     const filtro = button.getAttribute("data-filter");
//     buscarDados({ filtro });
//     document.getElementById("filterMenu").style.display = "none";
//   });
// });

// document.getElementById("aplicarIntervalo").addEventListener("click", () => {
//   const inicio = document.getElementById("inicioFiltro").value;
//   const fim = document.getElementById("fimFiltro").value;

//   if (!inicio || !fim) {
//     alert("Preencha as duas datas.");
//     return;
//   }

//   buscarDados({ inicio, fim });
//   document.getElementById("filterMenu").style.display = "none";
// });

// buscarDados({ filtro: "inicio" });



// Cálculos de consumo de acordo com tarifas do IPCIP

// const tarifaBase = /* tarifa base do período */;
// const ipci = /* percentual IPCI, ex: 0.03 para 3% */;
// const bandeira = /* bandeira atual, ex: 'bandeiraVerde', 'bandeiraAmarela', etc */;
// const consumoTotal = /* consumo total em kWh ou Watts */;

// // Multiplicadores por bandeira (exemplo)
// const multiplicadoresBandeira = {
//   bandeiraVerde: 1,
//   bandeiraAmarela: 1.2,
//   bandeiraVermelha1: 1.5,
//   bandeiraVermelha2: 1.8,
// };

// // Pega o multiplicador correspondente (ou 1 se não encontrado)
// const multiplicador = multiplicadoresBandeira[bandeira] || 1;

// // Calcula tarifa ajustada considerando bandeira e IPCI
// const tarifaAjustada = tarifaBase * multiplicador * (1 + ipci);

// // Calcula preço final
// const precoTotal = consumoTotal * tarifaAjustada;

// console.log(`Preço total: R$ ${precoTotal.toFixed(2)}`);


