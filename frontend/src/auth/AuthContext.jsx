// Sessão do usuário, disponível pro app inteiro via useAuth().
//
// Fluxo quando o app abre (ou dá F5):
//   1. espera o Firebase restaurar a sessão (esperarUsuario)
//   2. se tem usuário, POST /auth/role — o backend re-sincroniza as
//      claims a partir do banco e devolve o perfil (nome, tipo, apto...)
//   3. guarda tudo SÓ em estado React (nada de perfil no localStorage:
//      fonte única é o backend, e o logout não precisa limpar nada)
//
// perfil.tipo (a "role") decide qual tela mostrar; quem manda de verdade
// é o backend, que valida o token em todo endpoint.
import { createContext, useContext, useEffect, useState } from "react";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth, esperarUsuario, obterToken } from "./firebase.js";

const AuthContext = createContext(null);

async function buscarPerfil() {
  const token = await obterToken();
  const resp = await fetch("/auth/role", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({}));
    throw new Error(corpo.error || corpo.erro || "Erro ao validar acesso");
  }
  const { perfil } = await resp.json();
  return perfil;
}

export function AuthProvider({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    let ativo = true; // evita setState depois do unmount (StrictMode)

    async function restaurar() {
      const user = await esperarUsuario();
      if (!ativo) return;

      if (!user) {
        setCarregando(false);
        return;
      }

      try {
        const p = await buscarPerfil();
        if (!ativo) return;
        setUsuario(user);
        setPerfil(p);
      } catch (err) {
        // Falha de rede não derruba a sessão — só loga. Sem perfil o
        // RequireRole manda pro login, que mostra o erro de verdade.
        console.error("Erro ao restaurar perfil:", err);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    restaurar();
    return () => {
      ativo = false;
    };
  }, []);

  // Chamado pelo Login.jsx DEPOIS do fluxo completo de login
  // (signIn + /auth/role + getIdToken(true)) — ver pages/Login.jsx.
  function entrar(user, p) {
    setUsuario(user);
    setPerfil(p);
  }

  async function sair() {
    // Preserva só o tema — preferência visual não é dado de sessão
    const tema = localStorage.getItem("tema");
    localStorage.clear();
    if (tema) localStorage.setItem("tema", tema);

    await firebaseSignOut(auth);
    setUsuario(null);
    setPerfil(null);
  }

  const valor = {
    carregando,
    usuario,
    perfil,
    role: perfil?.tipo || null,
    entrar,
    sair,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
