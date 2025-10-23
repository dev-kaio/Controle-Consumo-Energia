import { auth, db } from "../auth/firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const form = document.getElementById("formInquilino");
const tbody = document.querySelector("#tabelaInquilinos tbody");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const apartamento = document.getElementById("apartamento").value.trim();

    if (!nome || !email || !senha || !apartamento) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const token = await auth.currentUser.getIdToken();

        await fetch("/usuarios/criar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ nome, email, senha, apartamento }),
        });

        alert("Inquilino criado!");
        form.reset();
        carregarInquilinos();
    } catch (err) {
        console.error(err);
        alert("Erro ao criar inquilino.");
    }
});

export async function carregarInquilinos() {
    try {
        const snapshot = await get(ref(db, "Usuarios"));
        const usuarios = snapshot.val();

        tbody.innerHTML = "";

        for (const uid in usuarios) {
            const u = usuarios[uid];
            if (u.tipo === "inquilino") {
                const tr = document.createElement("tr");
                tr.innerHTML = `
          <td>${u.nome}</td>
          <td>${u.apartamento}</td>
          <td>${u.ativo ? "Ativo" : "Inativo"}</td>
          <td style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="desativar('${uid}', ${!u.ativo})">
              ${u.ativo ? "Desativar" : "Ativar"}
            </button>
            <button onclick="editar('${uid}')">
              Editar
            </button>
          </td>
        `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar inquilinos.</td></tr>";
    }
}

// window.editar = (uid) => { abrir popup/modal
// }

window.desativar = async (uid, novoEstado) => {
    try {
        const token = await auth.currentUser.getIdToken();
        await fetch("/usuarios/atualizar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ uid, dados: { ativo: novoEstado } }),
        });
        carregarInquilinos();
    } catch (err) {
        console.error(err);
        alert("Erro ao atualizar status.");
    }
};

carregarInquilinos();
