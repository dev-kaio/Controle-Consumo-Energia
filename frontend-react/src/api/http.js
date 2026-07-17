// Toda conversa com o backend passa por aqui.
//
// - URLs são relativas (/usuarios/listar) — em dev o proxy do Vite
//   repassa pro :3000, em produção o backend serve o app na mesma origem.
// - O token vai no header Authorization e NUNCA no localStorage
//   (um XSS conseguiria roubar a sessão de lá).
// - Erro do backend vira um Error com a mensagem do campo "erro"/"error"
//   do JSON — quem chama só precisa de try/catch.
import { obterToken } from "../auth/firebase.js";

async function requisitar(url, opcoes = {}) {
  const token = await obterToken();
  const resp = await fetch(url, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opcoes.headers || {}),
    },
  });

  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(corpo.erro || corpo.error || `Erro ${resp.status}`);
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
