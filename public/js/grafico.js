import { signOut } from "../auth/firebaseConfig.js";

const btnLogout = document.getElementById("logout");

btnLogout.addEventListener("click", Sair());

async function Sair() {
  try {
    await signOut;
    //Controle de session e desativar token
  } catch (error) {
    console.log("Erro ao deslogar.");
  }
}

const ctx = document.getElementById("meuGrafico").getContext("2d");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
    datasets: [
      {
        label: "Consumo (em Watts)",
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: "rgb(102, 6, 235)",
        fill: false,
        tension: 0.1,
      },
    ],
  },
});
