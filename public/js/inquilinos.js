//Apagar

import { auth, db, verificarToken } from "../auth/firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const form = document.getElementById("formInquilino");
const tbody = document.querySelector("#tabelaInquilinos tbody");

document.addEventListener('DOMContentLoaded', () => {
    verificarToken();

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

    async function carregarInquilinos() {
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
            <button class="editar-btn">
                            Editar
                        </button>
                        <button class="alterarSenha-btn">
                            Alterar Senha
                        </button>
                        <button class="deletar-btn">
                            Deletar Usuário
                        </button>
          </td>
        `;

                    const editarBtn = tr.querySelector(".editar-btn");
                    editarBtn.addEventListener("click", () => editar(uid, u));

                    const alterarSenhaBtn = tr.querySelector(".alterarSenha-btn");
                    alterarSenhaBtn.addEventListener("click", () => alterarSenha());

                    const deletarBtn = tr.querySelector(".deletar-btn");
                    deletarBtn.addEventListener("click", () => excluir(uid));

                    tbody.appendChild(tr);
                }
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar inquilinos.</td></tr>";
        }
    }

    window.editar = (uid, u) => {
        document.getElementById("modalEditar").style.display = "flex";
        document.getElementById("editarNome").value = u.nome;
        document.getElementById("editarEmail").value = u.email;
        document.getElementById("editarApartamento").value = u.apartamento;

        document.getElementById("formEditarInquilino").onsubmit = async (e) => {
            e.preventDefault();
            const nome = document.getElementById("editarNome").value.trim();
            const email = document.getElementById("editarEmail").value.trim();
            const apartamento = document.getElementById("editarApartamento").value.trim();
            if (!nome || !email || !apartamento) {
                alert("Preencha todos os campos!");
                return;
            }

            try {
                const token = await auth.currentUser.getIdToken();
                await fetch("/usuarios/atualizar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ uid, dados: { nome, email, apartamento } }),
                });
                console.log("Inquilino atualizado com sucesso");
                alert("Inquilino atualizado!");
                document.getElementById("modalEditar").style.display = "none";
                carregarInquilinos();
            } catch (err) {
                console.error(err);
                alert("Erro ao atualizar inquilino.");
            }
        }
    }

    document.getElementById("fecharEditar").onclick = () => {
        document.getElementById("modalEditar").style.display = "none";
    }

    window.alterarSenha = () => {
        document.getElementById("alterarSenha").style.display = "flex";
        document.getElementById("formAlterarSenha").onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById("alterarSenhaEmail").value.trim();
            if (!email) {
                alert("Preencha o email!");
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                alert("E-mail de redefinição enviado para " + email);
                document.getElementById("alterarSenha").style.display = "none";
                document.getElementById("alterarSenhaEmail").value = "";
            } catch (err) {
                console.error(err);
                alert("Erro ao enviar e-mail de redefinição.");
            }

        }
    }

    document.getElementById("fecharAlterarSenha").onclick = () => {
        document.getElementById("alterarSenha").style.display = "none";
    }

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

    // window.excluir = (uid) => {
    //     document.getElementById("modalDeletar").style.display = "flex";
    //     document.getElementById("formDeletarInquilino").onclick = async (e) => {

    //         e.preventDefault();
    //         try {
    //             const token = await auth.currentUser.getIdToken();
    //             await fetch("/usuarios/deletar", {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     Authorization: `Bearer ${token}`,
    //                 },
    //                 body: JSON.stringify({ uid }),
    //             });
    //             alert("Inquilino deletado!");
    //             document.getElementById("modalDeletar").style.display = "none";
    //             carregarInquilinos();
    //         } catch (err) {
    //             console.error(err);
    //             alert("Erro ao deletar inquilino.");
    //         }
    //         document.getElementById("cancelarDeletar").onclick = () => {
    //             document.getElementById("modalDeletar").style.display = "none"; // Fecha o modal
    //         };
    //     }
    // }

    // document.getElementById("formDeletarInquilino").onclick = () => {
    //     document.getElementById("modalDeletar").style.display = "none";
    // }
    carregarInquilinos();
});