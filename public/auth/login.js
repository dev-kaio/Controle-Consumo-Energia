import { auth, db, signOut } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  ref,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// const mensagem = document.getElementById("mensagem");
const mensagemL = document.getElementById("mensagemL");
const loginForm = document.getElementById("formLogin");
// const registerForm = document.getElementById("formRegistro");
// const registerButton = document.getElementById("register-button");
const loginButton = document.getElementById("login-button");

// async function sendTokenToBackend(idToken, path) {
//   const response = await fetch(path, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${idToken}`,
//     },
//     body: JSON.stringify({}),
//   });

//   if (!response.ok) {
//     const errorData = await response.json().catch(() => null);
//     const message = errorData?.error || "Erro ao comunicar com backend";
//     throw new Error(message);
//   }

//   return response.json();
// }

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
      password
    );
    const user = userCredential.user;
    const uid = user.uid;
    const token = await user.getIdToken();
    localStorage.setItem("token", token);

    const userRef = ref(db, `Usuarios/${uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      mensagemL.textContent = "Usuário não encontrado no banco de dados.";
      await signOut(auth);
      return;
    }

    const dados = snapshot.val();

    localStorage.setItem("tipoUsuario", dados.tipo);
    localStorage.setItem("apartamentoId", dados.apartamento || "");


    if (!dados || !dados.tipo) {
      mensagemL.textContent = "Usuário sem permissão configurada.";
      setTimeout(() => {
        mensagemL.textContent = "";
        signOut();
      }, 2000);
      return;
    }

    // Redireciona de acordo com o tipo
    if (dados.tipo === "dono") {
      window.location.href = "pages/menu.html";
    } else if (dados.tipo === "inquilino") {
      if (!dados.ativo) {
        mensagemL.textContent = "Usuário inativo. Fale com o administrador.";
        signOut();
        return;
      }
      window.location.href = `pages/menu-inquilino.html/${dados.apartamento}`;
    } else {
      mensagemL.textContent = "Tipo de usuário desconhecido.";
      signOut();
    }
  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    mensagemL.textContent = error.message || "Ocorreu um erro, tente novamente.";

    setTimeout(() => {
      mensagemL.textContent = "";
      loginButton.disabled = false;
    }, 3000);
  }
});

// Registro
// registerForm.addEventListener("submit", async (e) => {
//   e.preventDefault();

//   registerButton.disabled = true;

//   const email = document.getElementById("register-email").value;
//   const password = document.getElementById("register-password").value;

//   try {
//     const userCredential = await createUserWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     const user = userCredential.user;

//     const idToken = await user.getIdToken();

//     await sendTokenToBackend(idToken, "/auth/registrar");

//     mensagem.textContent = "Usuário registrado com sucesso! Logando...";

//     setTimeout(() => {
//       mensagem.textContent = "";
//       window.location.href = "pages/menu.html";
//       registerButton.disabled = false;
//     }, 2000);
//   } catch (error) {
//     mensagem.innerHTML = `Ocorreu um erro. Usuário possivelmente já cadastrado <br> Tente novamente.`;

//     setTimeout(() => {
//       mensagem.innerHTML = "";
//       registerButton.disabled = false;
//     }, 2000);
//   }
// });


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
//setupPasswordToggle("toggle-register-password", "register-password");
