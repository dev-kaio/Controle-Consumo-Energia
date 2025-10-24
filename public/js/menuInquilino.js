
// firebase.auth().onAuthStateChanged(async (user) => {
// const snap = await firebase.database().ref(`usuarios/${user.uid}`).once('value');
// const dados = snap.val();
// const apt = dados.apartamento;

// const consumoSnap = await firebase.database().ref(`consumo/${apt}`).once('value');
// const data = consumoSnap.val();

// // monta gráfico usando data
// });



// Importando o Firebase (apenas se você estiver usando módulos, caso contrário, remova essa linha)
import { db } from "./firebaseConfig.js";  // Certifique-se de que seu arquivo firebaseConfig.js está configurado corretamente
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Função para obter o apartamentoId da URL
function getApartamentoIdFromUrl() {
  const urlPath = window.location.pathname;  // Exemplo: "/pages/menu-inquilino.html/12345"
  const apartamentoId = urlPath.split("/")[2];  // Extrai o ID (ex: "12345")
  return apartamentoId;
}

// Função para puxar os dados do apartamento
async function fetchApartamentoData(apartamentoId) {
  try {
    // Referência ao nó do apartamento no Realtime Database
    const apartamentoRef = ref(db, `Apartamentos/${apartamentoId}`);
    const snapshot = await get(apartamentoRef);

    if (snapshot.exists()) {
      const dadosApartamento = snapshot.val();
      console.log(dadosApartamento);  // Log para depuração

      // Preenchendo os dados na página HTML
      document.getElementById("apartamento-nome").textContent = dadosApartamento.nome || "Nome do apartamento não disponível";
      document.getElementById("apartamento-descricao").textContent = dadosApartamento.descricao || "Descrição não disponível";
      document.getElementById("apartamento-preco").textContent = `R$ ${dadosApartamento.preco || "0,00"}`;
      document.getElementById("apartamento-localizacao").textContent = dadosApartamento.localizacao || "Localização não especificada";
    } else {
      document.getElementById("mensagem").textContent = "Apartamento não encontrado.";
    }
  } catch (error) {
    console.error("Erro ao carregar os dados do apartamento:", error);
    document.getElementById("mensagem").textContent = "Ocorreu um erro ao carregar os dados do apartamento.";
  }
}

// Função principal
(function() {
  const apartamentoId = getApartamentoIdFromUrl();
  
  if (apartamentoId) {
    fetchApartamentoData(apartamentoId);
  } else {
    document.getElementById("mensagem").textContent = "ID do apartamento não encontrado na URL.";
  }
})();
