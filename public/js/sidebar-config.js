import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth } from "../auth/firebaseConfig.js";

document.addEventListener("DOMContentLoaded", async () => {
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");

  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  document.getElementById("senha-btn").addEventListener("click", alterarSenha);

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

  document
    .getElementById("fecharAlterarSenha")
    .addEventListener("click", () => {
      document.getElementById("alterarSenha").style.display = "none";
    });

  const tipo = localStorage.getItem("tipoUsuario");

  const linkInquilinos = document.getElementById("linkInquilinos");

  if (tipo !== "dono") {
    linkInquilinos.style.display = "none";
  }
});
