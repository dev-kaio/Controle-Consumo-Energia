// Toda conversa com o backend passa por aqui.
//
// - URLs são relativas (/usuarios/listar) — em dev o proxy do Vite
//   repassa pro :3000, em produção o backend serve o app na mesma origem.
// - O token vai no header Authorization e NUNCA no localStorage
//   (um XSS conseguiria roubar a sessão de lá).
// - Erro do backend vira um Error com a mensagem do campo "erro"/"error"
//   do JSON, mais o `status` — quem chama só precisa de try/catch e manda o
//   erro pro utils/mensagensErro.js, que decide o que o usuário lê.
import { obterToken } from "../auth/firebase.js";

async function requisitar(url, opcoes = {}) {
  const token = await obterToken();

  let resp;
  try {
    resp = await fetch(url, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opcoes.headers || {}),
      },
    });
  } catch (err) {
    // AbortController cancelou: passa intacto, quem chamou distingue pelo
    // name (ver api/consumo.js) e ignora em silêncio.
    if (err.name === "AbortError") throw err;
    // Fora isso, fetch só rejeita por falha de rede — backend fora do ar,
    // wifi caiu, celular offline. Marcamos pra virar frase de gente.
    const semRede = new Error("Sem conexão");
    semRede.semRede = true;
    throw semRede;
  }

  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const erro = new Error(corpo.erro || corpo.error || `Erro ${resp.status}`);
    erro.status = resp.status;
    throw erro;
  }
  return corpo;
}

export function apiGet(url, opcoes = {}) {
  return requisitar(url, opcoes);
}

export function apiPost(url, body, opcoes = {}) {
  return requisitar(url, {
    method: "POST",
    body: JSON.stringify(body),
    ...opcoes,
  });
}
