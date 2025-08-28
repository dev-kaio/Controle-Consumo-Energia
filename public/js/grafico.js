import { signOut } from "../auth/firebaseConfig.js";

const btnLogout = document.getElementById("logout");

btnLogout.addEventListener("click", Sair);

async function Sair() {
  try {
    await signOut;
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
});


async function carregarConsumo(filtro) {
  try {
    let url = "/firebase/consumo";
    if (filtro) {
      url += `?periodo=${filtro}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.valores;
    chart.update();
  } catch (error) {
    console.error("Erro ao carregar consumo:", error);
  }
}

document.querySelectorAll(".filter-menu button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const filtro = btn.getAttribute("data-filter");
    carregarConsumo(filtro);
  });
});

// 5. Aplica o filtro com intervalo de datas personalizado
document.getElementById("aplicarIntervalo").addEventListener("click", () => {
  const inicio = document.getElementById("inicioFiltro").value;
  const fim = document.getElementById("fimFiltro").value;

  // Verifica se ambas as datas foram selecionadas
  if (inicio && fim) {
    console.log("Filtro de intervalo aplicado: ", inicio, fim);
    carregarConsumo(null, inicio, fim);  // Passa null para filtro e as datas para intervalo
  } else {
    alert("Selecione as duas datas para aplicar o filtro.");
  }
});


// 6. Carrega os dados de consumo para o filtro "dia" como padrão ao carregar a página
carregarConsumo("dia");
