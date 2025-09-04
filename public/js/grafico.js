import { signOut } from "../auth/firebaseConfig.js";

const btnLogout = document.getElementById("logout");
btnLogout.addEventListener("click", Sair);

async function Sair() {
  try {
    await signOut();
    //Limpar localSotrage
    //Controle de session e desativar token
  } catch (error) {
    console.log("Erro ao deslogar.");
  }
}

const ctx = document.getElementById("meuGrafico").getContext("2d");

let chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Consumo (em Watts)",
        data: [],
        backgroundColor: "rgb(102, 6, 235)",
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

function atualizarGrafico(labels, dados) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = dados;
  chart.update();
}

function atualizarMediaConsumo(media, filtroDisplay) {
  const titulo = document.getElementById("tituloMediaConsumo");
  const valor = document.getElementById("valorMediaConsumo");

  titulo.innerHTML = `Média de Consumo:<br> ${filtroDisplay}`;
  valor.textContent = media ? `${media.toFixed(2)} Watts` : "--";
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
      case "diaSemana":
        chave = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
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

  const labels = Object.keys(grupos).sort((a, b) => {
    return new Date("01/" + a) - new Date("01/" + b); // funciona para mes/ano e dia
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

async function buscarDados(params) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`/firebase/consumo?${queryString}`);

    if (!response.ok) throw new Error("Erro ao buscar dados");

    const data = await response.json();

    if (!data || data.length === 0) {
      alert("Nenhum dado encontrado no intervalo selecionado.");
      atualizarGrafico([], []);
      atualizarMediaConsumo(null, "intervalo selecionado");
      return;
    }

    let agrupamento = "raw"; // default
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

    let labels, consumos;
    if (agrupamento === "raw" || agrupamento === "hora") {
      labels = data.map((item) =>
        new Date(item.timestamp).toLocaleString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      );
      consumos = data.map((item) => item.consumo);
    } else {
      const agrupado = agruparDados(data, agrupamento);
      labels = agrupado.labels;
      consumos = agrupado.consumos;
    }

    atualizarGrafico(labels, consumos);

    const soma = consumos.reduce((acc, val) => acc + val, 0);
    const media = soma / consumos.length;

    atualizarMediaConsumo(media, filtroDisplay);
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar os dados");
  }
}

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

buscarDados({ filtro: "inicio" });



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


/*

Sem agrupamento

import { signOut } from "../auth/firebaseConfig.js";

const btnLogout = document.getElementById("logout");

btnLogout.addEventListener("click", Sair);

async function Sair() {
  try {
    await signOut();
    //Limpar localSotrage
    //Controle de session e desativar token
  } catch (error) {
    console.log("Erro ao deslogar.");
  }
}
const ctx = document.getElementById("meuGrafico").getContext("2d");

let chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Consumo (em Watts)",
        data: [],
        backgroundColor: "rgb(102, 6, 235)",
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

function atualizarGrafico(labels, dados) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = dados;
  chart.update();
}

function atualizarMediaConsumo(media, filtroDisplay) {
  const titulo = document.getElementById("tituloMediaConsumo");
  const valor = document.getElementById("valorMediaConsumo");

  titulo.innerHTML = `Média de Consumo:<br> ${filtroDisplay}`;
  valor.textContent = media ? `${media.toFixed(2)} Watts` : "--";
}

async function buscarDados(params) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`/firebase/consumo?${queryString}`);

    if (!response.ok) throw new Error("Erro ao buscar dados");

    const data = await response.json();

    if (!data || data.length === 0) {
      alert("Nenhum dado encontrado no intervalo selecionado.");
      atualizarGrafico([], []);
      atualizarMediaConsumo(null, "intervalo selecionado");
      return;
    }

    const labels = data.map((item) =>
      new Date(item.timestamp).toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    );

    const consumos = data.map((item) => item.consumo);

    atualizarGrafico(labels, consumos);

    const soma = consumos.reduce((acc, val) => acc + val, 0);
    const media = soma / consumos.length;

    let filtroDisplay = "intervalo selecionado";
    if (params.filtro) {
      const mapFiltros = {
        hora: "Última Hora",
        dia: "Hoje",
        semana: "Última Semana",
        mes: "Último Mês",
        ano: "Último Ano",
        inicio: "Desde o Início",
      };
      filtroDisplay = mapFiltros[params.filtro] || "intervalo selecionado";
    } else if (params.inicio && params.fim) {
      filtroDisplay = `${new Date(params.inicio).toLocaleDateString()} até ${new Date(params.fim).toLocaleDateString()}`;
    }

    atualizarMediaConsumo(media, filtroDisplay);
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar os dados");
  }
}

document.querySelectorAll('.filter-menu button[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const filtro = button.getAttribute('data-filter');
    buscarDados({ filtro });
    document.getElementById('filterMenu').style.display = 'none';
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
  document.getElementById('filterMenu').style.display = 'none';
});

buscarDados({ filtro: "inicio" });
*/