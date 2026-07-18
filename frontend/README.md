# Palm Energy — Frontend (React + Vite)

SPA em React (JavaScript puro, sem TypeScript). Visual e comportamento
são o design system do projeto (ver `docs/DESIGN-SYSTEM.md` na raiz).

## O mapa mental (onde cada coisa mora)

```
src/
├── pages/        ← UMA TELA = UM ARQUIVO. Login, Dashboard, Inquilinos,
│                   Estrutura, Superadmin, Config. Só composição.
├── components/   ← peças reutilizáveis, agrupadas por área:
│   ├── layout/     header, sidebar, botão de tema (casca de toda página)
│   ├── ui/         Modal, MsgFeedback, CampoSenha (genéricos)
│   ├── dashboard/  filtro, gráfico, médias, cards de inquilino
│   ├── inquilinos/ form, tabela e modais da gestão de inquilinos
│   ├── estrutura/  os 5 painéis (condomínio, prédios, aptos, medidores, tarifas)
│   └── superadmin/ form unificado + lista com accordions
├── api/          ← TODA conversa com o backend (1 arquivo por domínio).
│                   http.js põe o token e padroniza erros.
├── auth/         ← Firebase (só autenticação!), AuthContext (sessão/perfil)
│                   e RequireRole (porteiro das rotas)
├── hooks/        ← useTema (claro/escuro), useConsumo (dados do dashboard)
├── utils/        ← funções puras: agregação temporal (com testes!) e
│                   formatação pt-BR
├── lib/          ← chartSetup.js (registro único do Chart.js)
└── styles/       ← CSS global por área; variables.css são os tokens
                    (cores/fontes) — o dark mode é `body.dark` trocando
                    as variáveis
```

Regras de bolso:

- Precisa falar com o backend? Cria/usa uma função em `api/` — nunca
  `fetch` solto em componente.
- Dado de sessão (quem sou, papel, apto)? `useAuth()` — nada de
  localStorage (só o tema vive lá).
- Rota nova? `App.jsx` (dentro do `RequireRole` certo) + arquivo em
  `pages/`.
- Estilo novo? Reaproveita as classes de `styles/` (`.panel`, `.campo`,
  `.btn-primary`, `.data-table`, `.msg-feedback`…).

## Rodando em desenvolvimento

Dois terminais:

```bash
# 1 — backend (API) na porta 3000
cd backend && npm run dev

# 2 — frontend com hot reload na porta 5173
cd frontend && npm run dev
```

Abra http://localhost:5173. O proxy do `vite.config.js` repassa os
fetches relativos (`/usuarios/...`) pro backend.

**REGRA DO PROXY:** rota nova no backend com prefixo novo? Adiciona o
prefixo em `PREFIXOS_API` no `vite.config.js` — senão "funciona em
prod, quebra em dev".

## Build de produção

```bash
cd frontend && npm run build   # gera frontend/dist
```

O backend serve o `dist/` automaticamente — com ele buildado, basta o
backend no ar (porta 3000) que o app inteiro funciona, PWA incluso.
`npm run preview` sobe o build localmente (porta 4173, com proxy).

## Testes

```bash
npm test   # node --test nas funções puras de src/utils/
```

## PWA

O service worker e o manifest são GERADOS no build pelo `vite-plugin-pwa`
(config no `vite.config.js`). API nunca é cacheada; estáticos ficam no
precache com hash. Pra forçar atualização nos clientes basta publicar um
build novo — o SW troca sozinho (autoUpdate).
