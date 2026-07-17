import { auth, signOut } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const mensagemL = document.getElementById("mensagemL");
const loginForm = document.getElementById("formLogin");
const loginButton = document.getElementById("login-button");

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginButton.disabled = true;

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // O backend define as claims (role/condominio/apto) a partir do que
    // está salvo no banco e devolve o perfil — o navegador não lê o
    // Firebase direto em nenhum momento.
    const response = await fetch("/auth/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || "Erro ao validar acesso");
    }

    const { perfil } = await response.json();

    // Força um token novo já com as claims recém-definidas
    await user.getIdToken(true);
    await auth.currentUser.reload();

    // O token JAMAIS vai pro localStorage (XSS roubaria a sessão) — quem
    // precisa dele usa obterToken() do firebaseConfig, sempre fresco.
    localStorage.setItem("tipoUsuario", perfil.tipo);
    localStorage.setItem("nomeUsuario", perfil.nome || "");
    localStorage.setItem("aptoID", perfil.aptoID || "");
    localStorage.setItem("condominioID", perfil.condominioID || "");

    // Redireciona de acordo com o tipo
    if (perfil.tipo === "admin" || perfil.tipo === "superadmin") {
      window.location.href = "pages/menu.html";
    } else if (perfil.tipo === "inquilino") {
      if (!perfil.ativo) {
        mensagemL.textContent = "Usuário inativo. Fale com o administrador.";
        setTimeout(() => {
          mensagemL.textContent = "";
          signOut();
        }, 5000);
        return;
      }

      window.location.href = `pages/menu-inquilino.html?aptoID=${encodeURIComponent(perfil.aptoID || "")}`;
    } else {
      mensagemL.textContent = "Tipo de usuário desconhecido.";
      signOut();
    }
  } catch (error) {
    console.error("Erro no login:", error);
    mensagemL.textContent =
      error.message || "Ocorreu um erro, tente novamente.";

    setTimeout(() => {
      mensagemL.textContent = "";
      loginButton.disabled = false;
    }, 3000);
  }
});

//Visibilidade da senha
const eyeOpenIcon = "./assets/eye-open.png";
const eyeClosedIcon = "./assets/eye-closed.png";

function setupPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);

  toggle.style.backgroundImage = `url(${eyeClosedIcon})`;

  toggle.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggle.style.backgroundImage = isPassword
      ? `url(${eyeOpenIcon})`
      : `url(${eyeClosedIcon})`;
  });
}

setupPasswordToggle("toggle-login-password", "login-password");
