// Tela de login (rota "/").
//
// Fluxo (o mesmo do app antigo, passo a passo):
//   1. signInWithEmailAndPassword no Firebase
//   2. POST /auth/role — o backend define as claims (papel/condomínio)
//      a partir do banco e devolve o perfil
//   3. getIdToken(true) — força um token NOVO já com essas claims
//      (sem isso o backend devolveria 403 com claims velhas)
//   4. inativo? mostra aviso e desloga; senão entra e vai pro /dashboard
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../auth/firebase.js";
import { useAuth } from "../auth/AuthContext.jsx";
import CampoSenha from "../components/ui/CampoSenha.jsx";
import ThemeToggle from "../components/layout/ThemeToggle.jsx";

export default function Login() {
  const { carregando, perfil, entrar, sair } = useAuth();
  const navegar = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Já logado (ex: F5 na tela de login)? Direto pro dashboard.
  if (!carregando && perfil) return <Navigate to="/dashboard" replace />;

  async function aoEnviar(e) {
    e.preventDefault();
    setEnviando(true);
    setMensagem("");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const user = cred.user;

      // Backend define as claims e devolve o perfil
      const resp = await fetch("/auth/role", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error || "Erro ao validar acesso");
      }
      const { perfil: p } = await resp.json();

      // Token novo já com as claims recém-definidas
      await user.getIdToken(true);

      if (p.tipo === "inquilino" && !p.ativo) {
        setMensagem("Usuário inativo. Fale com o administrador.");
        await sair();
        setEnviando(false);
        return;
      }

      entrar(user, p);
      navegar("/dashboard", { replace: true });
    } catch (err) {
      console.error("Erro no login:", err);
      setMensagem(err.message || "Ocorreu um erro, tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <div className="container-title">
        <span className="bolt">⚡</span> Palm Energy
        <span className="tagline">
          Monitoramento de energia do seu condomínio
        </span>
      </div>

      <div className="container">
        <h2>Entrar</h2>
        <form onSubmit={aoEnviar}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <CampoSenha
            id="login-password"
            label="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <p className="mensagem-login">{mensagem}</p>

          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>

      <ThemeToggle className="tema-flutuante" />
    </div>
  );
}
