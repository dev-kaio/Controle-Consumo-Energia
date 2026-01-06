import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHqqnE10yGmOkIVt5mpXyW4-rKUUZbrJY",
  authDomain: "controle-energia-d3121.firebaseapp.com",
  projectId: "controle-energia-d3121",
  storageBucket: "controle-energia-d3121.firebasestorage.app",
  messagingSenderId: "899177269932",
  appId: "1:899177269932:web:0e8a95b5c31eadb3fd6d09",
  measurementId: "G-RRECH79BD7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function signOut() {
  try {
    await firebaseSignOut(auth);
    window.location.href = "/";
  } catch (error) {
    console.error("Erro ao deslogar:", error);
  }
}

async function verificarToken(roleNecessaria = null) {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/index.html";
      return;
    }

    const token = await user.getIdTokenResult(true);

    if (token.claims.role !== "dono") {
      alert("Acesso negado");
      window.location.href = "./menu.html";
      return;
    }

    try {
      // Força pegar o token mais recente (com role)
      const tokenResult = await user.getIdTokenResult(true);

      // Se a página exigir um tipo de usuário
      if (roleNecessaria && tokenResult.claims.role !== roleNecessaria) {
        alert("Você não tem permissão para acessar esta página.");
        window.location.href = "./menu-inquilino.html";
        return;
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      await firebaseSignOut(auth);
      window.location.href = "/index.html";
    }
  });
}

// function signOutAndRedirect() {
//   firebaseSignOut(getAuth())
//     .then(() => {
//       window.location.href = "/index.html";
//     })
//     .catch((error) => {
//       console.error("Erro ao deslogar:", error);
//       window.location.href = "/index.html";
//     });
// }

export { app, auth, db, signOut, verificarToken };
