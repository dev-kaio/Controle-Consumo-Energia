import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHqqnE10yGmOkIVt5mpXyW4-rKUUZbrJY",
  authDomain: "controle-energia-d3121.firebaseapp.com",
  projectId: "controle-energia-d3121",
  storageBucket: "controle-energia-d3121.firebasestorage.app",
  messagingSenderId: "899177269932",
  appId: "1:899177269932:web:0e8a95b5c31eadb3fd6d09",
  measurementId: "G-RRECH79BD7"
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

async function verificarToken() {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const tokenResult = await user.getIdTokenResult(true); // Força a renovação do token
        const expirationTime = tokenResult.expirationTime;

        // Verifica se o token expirou
        if (Date.now() >= expirationTime) {
          console.log("Token expirado, redirecionando...");
          signOutAndRedirect();
        }
      } catch (error) {
        console.error("Erro ao verificar o token:", error);
        signOutAndRedirect();
      }
    } else {
      signOutAndRedirect();
    }
  });
}

function signOutAndRedirect() {
  firebaseSignOut(getAuth())
    .then(() => {
      window.location.href = "/index.html";
    })
    .catch(error => {
      console.error("Erro ao deslogar:", error);
      window.location.href = "/index.html";
    });
}


export { app, auth, db, signOut, verificarToken };
