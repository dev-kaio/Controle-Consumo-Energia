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

async function verificarToken(rolesPermitidos = []) {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/index.html";
      return;
    }

    try {
      // pega token com claims atualizadas
      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role;

      // se não tiver role definida
      if (!role) {
        alert("Usuário sem permissão.");
        window.location.href = "/index.html";
        return;
      }

      // valida roles permitidas
      if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
        alert("Acesso negado");

        // redireciona baseado no tipo
        if (role === "inquilino") {
          window.location.href = "/pages/menu-inquilino.html";
        } else {
          window.location.href = "/pages/menu.html";
        }

        return;
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      await signOut(auth);
      window.location.href = "/index.html";
    }
  });
}

/**
 * Retorna dados do usuário logado do localStorage
 */
function getUsuarioLogado() {
  return {
    tipo: localStorage.getItem("tipoUsuario") || null,
    condominioID: localStorage.getItem("condominioID") || null,
    aptoID: localStorage.getItem("aptoID") || null,
    uid: null, // UID vem do Firebase Auth, não do localStorage
  };
}

export { app, auth, db, signOut, verificarToken, getUsuarioLogado };
