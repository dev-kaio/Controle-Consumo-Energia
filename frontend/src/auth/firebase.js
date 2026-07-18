// Conexão com o Firebase — SÓ autenticação.
//
// O app nunca lê o Realtime Database daqui: todo dado passa pelo
// backend, que valida o token e aplica as regras por papel/condomínio
// (ver docs/ARQUITETURA.md).
//
// Esta config é PÚBLICA por design: identifica o projeto, não dá acesso
// a nada — o acesso é controlado pelas regras e pelo backend.
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
export const auth = getAuth(app);

// Espera o Firebase restaurar a sessão e devolve o usuário (ou null).
// auth.currentUser é null até o onAuthStateChanged disparar no primeiro
// carregamento — quem precisa de token no load usa isso, nunca currentUser.
export function esperarUsuario() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const parar = onAuthStateChanged(auth, (user) => {
      parar();
      resolve(user);
    });
  });
}

// Token sempre fresco (o SDK renova sozinho antes de expirar).
// Vive fora do React de propósito: o api/http.js usa sem precisar de hook.
export async function obterToken() {
  const user = await esperarUsuario();
  return user ? user.getIdToken() : null;
}
