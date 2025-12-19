import { auth, db, verificarToken } from "../auth/firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
    verificarToken();

    const form = document.getElementById("formInquilino");
    const tbody = document.querySelector("#tabelaInquilinos tbody");

    /* ==========================
       CADASTRAR INQUILINO
    ========================== */
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

    /* ==========================
       LISTAR INQUILINOS
    ========================== */
    async function carregarInquilinos() {
        try {
            const snapshot = await get(ref(db, "Usuarios"));
            const usuarios = snapshot.val();

            tbody.innerHTML = "";

            if (!usuarios) return;

            for (const uid in usuarios) {
                const u = usuarios[uid];
                if (u.tipo !== "inquilino") continue;

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${u.nome}</td>
                    <td>${u.apartamento}</td>
                    <td>${u.ativo ? "Ativo" : "Inativo"}</td>
                    <td style="display:flex; gap:10px; justify-content:center;">
                        <button class="status-btn">
                            ${u.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button class="editar-btn">Editar</button>
                        <button class="senha-btn">Alterar Senha</button>
                        <button class="deletar-btn">Deletar</button>
                    </td>
                `;

                tr.querySelector(".status-btn")
                    .addEventListener("click", () => desativar(uid, !u.ativo));

                tr.querySelector(".editar-btn")
                    .addEventListener("click", () => editar(uid, u));

                tr.querySelector(".senha-btn")
                    .addEventListener("click", () => alterarSenha());

                tr.querySelector(".deletar-btn")
                    .addEventListener("click", () => excluir(uid));

                tbody.appendChild(tr);
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML =
                "<tr><td colspan='4'>Erro ao carregar inquilinos.</td></tr>";
        }
    }

    /* ==========================
       EDITAR INQUILINO
    ========================== */
    function editar(uid, u) {
        const modal = document.getElementById("modalEditar");
        modal.style.display = "flex";

        document.getElementById("editarNome").value = u.nome;
        document.getElementById("editarEmail").value = u.email;
        document.getElementById("editarApartamento").value = u.apartamento;

        const formEditar = document.getElementById("formEditarInquilino");

        formEditar.onsubmit = async (e) => {
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
                    body: JSON.stringify({
                        uid,
                        dados: { nome, email, apartamento },
                    }),
                });

                alert("Inquilino atualizado!");
                modal.style.display = "none";
                carregarInquilinos();
            } catch (err) {
                console.error(err);
                alert("Erro ao atualizar inquilino.");
            }
        };
    }

    document.getElementById("fecharEditar")
        .addEventListener("click", () => {
            document.getElementById("modalEditar").style.display = "none";
        });

    /* ==========================
       ALTERAR SENHA
    ========================== */
    function alterarSenha() {
        const modal = document.getElementById("alterarSenha");
        modal.style.display = "flex";

        const formSenha = document.getElementById("formAlterarSenha");

        formSenha.onsubmit = async (e) => {
            e.preventDefault();

            const email = document.getElementById("alterarSenhaEmail").value.trim();
            if (!email) {
                alert("Preencha o email!");
                return;
            }

            try {
                await sendPasswordResetEmail(auth, email);
                alert("E-mail de redefinição enviado!");
                modal.style.display = "none";
                formSenha.reset();
            } catch (err) {
                console.error(err);
                alert("Erro ao enviar e-mail.");
            }
        };
    }

    document.getElementById("fecharAlterarSenha")
        .addEventListener("click", () => {
            document.getElementById("alterarSenha").style.display = "none";
        });

    /* ==========================
       ATIVAR / DESATIVAR
    ========================== */
    async function desativar(uid, ativo) {
        try {
            const token = await auth.currentUser.getIdToken();

            await fetch("/usuarios/atualizar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    uid,
                    dados: { ativo },
                }),
            });

            carregarInquilinos();
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar status.");
        }
    }

    /* ==========================
       EXCLUIR INQUILINO
    ========================== */
    async function excluir(uid) {
        if (!confirm("Tem certeza que deseja excluir este inquilino?")) return;

        try {
            const token = await auth.currentUser.getIdToken();

            await fetch("/usuarios/deletar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ uid }),
            });

            alert("Inquilino deletado!");
            carregarInquilinos();
        } catch (err) {
            console.error(err);
            alert("Erro ao deletar inquilino.");
        }
    }

    carregarInquilinos();
});
