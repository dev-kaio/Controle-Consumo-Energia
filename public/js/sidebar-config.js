import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth } from "../auth/firebaseConfig.js";

// Página de configurações: dados da conta + redefinição de senha.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("voltar").addEventListener("click", (e) => {
    e.preventDefault();
    window.history.back();
  });

  // ----- Minha conta (dados salvos no login) -----
  const ROTULOS_TIPO = {
    superadmin: "Dono do sistema",
    admin: "Administrador do condomínio",
    inquilino: "Inquilino",
  };

  const tipo = localStorage.getItem("tipoUsuario") || "";
  const aptoID = localStorage.getItem("aptoID") || "";
  const condominioID = localStorage.getItem("condominioID") || "";
  const nome = localStorage.getItem("nomeUsuario") || "";

  document.getElementById("contaNome").textContent = nome || "—";
  document.getElementById("contaTipo").textContent =
    ROTULOS_TIPO[tipo] || tipo || "—";

  if (aptoID) {
    document.getElementById("linhaApto").style.display = "";
    document.getElementById("contaApto").textContent = aptoID;
  }
  if (condominioID) {
    document.getElementById("linhaCondominio").style.display = "";
    document.getElementById("contaCondominio").textContent = condominioID;
  }

  // Email vem do Firebase Auth (fonte confiável); também pré-preenche o
  // formulário de redefinição pra ninguém precisar digitar o próprio email
  const inputEmail = document.getElementById("alterarSenhaEmail");
  const parar = auth.onAuthStateChanged((user) => {
    parar();
    if (user?.email) {
      document.getElementById("contaEmail").textContent = user.email;
      if (!inputEmail.value) inputEmail.value = user.email;
    }
  });

  // ----- Redefinir senha -----
  const msg = document.getElementById("msgSenha");

  document
    .getElementById("formAlterarSenha")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = inputEmail.value.trim();
      if (!email) {
        msg.textContent = "Preencha o email.";
        msg.className = "msg-feedback erro";
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        msg.textContent = "Email de redefinição enviado! Confira sua caixa de entrada.";
        msg.className = "msg-feedback ok";
      } catch (err) {
        console.error(err);
        msg.textContent = "Erro ao enviar o email. Confira o endereço.";
        msg.className = "msg-feedback erro";
      }
    });
});
