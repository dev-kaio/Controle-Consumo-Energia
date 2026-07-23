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
import { mensagemAmigavel } from "../utils/mensagensErro.js";
import CampoSenha from "../components/ui/CampoSenha.jsx";
import ModalResetSenha from "../components/ui/ModalResetSenha.jsx";
import ThemeToggle from "../components/layout/ThemeToggle.jsx";

export default function Login() {
  const { carregando, perfil, entrar, sair } = useAuth();
  const navegar = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resetAberto, setResetAberto] = useState(false);

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
        const corpo = await resp.json().catch(() => null);
        // Mesmo formato de erro do api/http.js (mensagem + status) pro
        // mensagemAmigavel conseguir traduzir. Este fetch é cru de propósito:
        // o token ainda não tem as claims, então não passa pelo api/.
        const err = new Error(corpo?.error || "Erro ao validar acesso");
        err.status = resp.status;
        throw err;
      }
      const { perfil: p } = await resp.json();

      // Token novo já com as claims recém-definidas
      await user.getIdToken(true);

      // Rede de segurança: um usuário desativado já é barrado antes daqui pelo
      // Firebase (auth/user-disabled), mas se por algum motivo passar, não entra.
      if (!p.ativo) {
        setMensagem("Conta desativada. Fale com o administrador.");
        await sair();
        setEnviando(false);
        return;
      }

      entrar(user, p);
      navegar("/dashboard", { replace: true });
    } catch (err) {
      console.error("Erro no login:", err);
      // Conta desativada, credencial errada, rede fora — todos os casos
      // moram no utils/mensagensErro.js (inclusive a regra de não revelar
      // se o e-mail existe).
      setMensagem(mensagemAmigavel(err));
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <div className="container-title">
         Palm Energy
        <span className="tagline">
          Controle de energia na palma da sua mão
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

          <button
            type="button"
            className="link-esqueci-senha"
            onClick={() => setResetAberto(true)}
          >
            Esqueci minha senha
          </button>
        </form>
      </div>

      {resetAberto && (
        <ModalResetSenha
          emailInicial={email}
          aoFechar={() => setResetAberto(false)}
        />
      )}

      <ThemeToggle className="tema-flutuante" />
    </div>
  );
}
