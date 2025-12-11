import { db } from "../auth/firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Função para pegar parâmetros de consulta da URL
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Função para carregar os dados do apartamento
async function loadApartamentoData() {
    const apartamentoId = getUrlParameter("apartamento");
    if (!apartamentoId) {
        console.error("Apartamento não especificado na URL.");
        return;
    }

    const apartamentoRef = ref(db, `Apartamentos/${apartamentoId}`);
    try {
        const snapshot = await get(apartamentoRef);
        if (snapshot.exists()) {
            const apartamentoData = snapshot.val();
            console.log(apartamentoData);
            document.getElementById("apartamento-nome").textContent = apartamentoData.nome;
            document.getElementById("apartamento-info").textContent = apartamentoData.informacoes;
        } else {
            console.log("Apartamento não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do apartamento:", error);
    }
}

// Carregar as informações assim que a página for carregada
window.onload = loadApartamentoData;
