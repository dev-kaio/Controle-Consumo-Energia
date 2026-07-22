# Palm Energy

Sistema de monitoramento e faturamento de energia para condomínios (medição
individualizada por apartamento). Projeto em desenvolvimento, com intenção de
virar produto comercial vendido a clientes reais (síndicos/administradoras).

## Stack

- **Backend:** Node.js + Express, Firebase Admin SDK (Realtime Database)
- **Frontend:** React + Vite (JavaScript puro, SEM TypeScript — decisão
  de simplicidade), react-router-dom, Chart.js via react-chartjs-2,
  PWA via vite-plugin-pwa. Ver `frontend/README.md` pro mapa de pastas.
- **Firmware:** ESP32 (`firmware/esp.cpp`), leitura Modbus (hoje simulada em testes),
  envia lotes via HTTP para o backend a cada ~60s
- **Auth:** Firebase Authentication + custom claims (`role`, `condominioID`,
  `predioID`, `apartamentoId`)

## Layout do repositório

Monorepo em transição — `backend/` e `frontend/` vão virar repos separados.
Não criar acoplamento novo entre os dois além de HTTP.

- `backend/` — Express + Firebase Admin. Tem `package.json` próprio; `.env`
  mora aqui. Serve o BUILD do frontend (`frontend/dist`) + fallback SPA
  (últimas linhas do `server.js` — somem na separação).
- `frontend/` — SPA React (Vite). Fala com o backend só por fetch relativo
  (`/auth/...`, `/usuarios/...`); em dev o proxy do `vite.config.js`
  repassa pro :3000 — **rota nova no backend = prefixo novo no proxy**.
- `firmware/` — `esp.cpp` da ESP32.
- `docs/` — compartilhada enquanto for monorepo.
- `package.json` da raiz só encaminha (`npm run dev` → `backend/`).

## Arquitetura em uma frase

`ESP32 → Backend (Express) → Firebase`. A ESP nunca fala com o Firebase
direto — isso é proposital (ver `docs/ARQUITETURA.md`). O frontend usa o
Firebase client SDK SÓ para autenticação (`frontend/src/auth/firebase.js`);
todo dado passa pelo backend via `frontend/src/api/`.

## Papéis (roles)

`inquilino` (mora em 1 apto) → `admin` (gerencia 1 condomínio) → `superadmin`
(acesso global, gerencia tarifas). Definidos via custom claims no token do
Firebase Auth, aplicados pelo middleware `authenticateToken`/`requireRole`
em `backend/routes/requires.js`.

## Regras que não podem ser quebradas sem avisar

- **Nunca reintroduzir** os bugs de segurança já corrigidos — ver
  `docs/SEGURANCA.md` antes de mexer em `backend/routes/auth.js`, `backend/routes/requires.js`
  ou `backend/routes/firebase.js`.
- **Contrato do frontend React**: tema = `useTema` + classe `dark` no
  `<body>` + localStorage `tema`. O localStorage guarda **só preferência
  deste aparelho** — hoje duas chaves: `tema` e `tour_visto_v1` (já viu o
  tutorial). Perfil/role vêm do `AuthContext` via POST /auth/role, NUNCA do
  localStorage. Sidebar/links por papel = `components/layout/Sidebar.jsx`.
  Os seletores CSS de `frontend/src/styles/` são o design system — não
  renomear classe sem atualizar o style junto.
- **IDs de apartamento** são compostos: `condominio-predio-numero`
  (ex: `sol-blocoA-101`). Cada segmento só aceita letras e números — o
  hífen é o separador. Validação/montagem em `backend/utils/idUtils.js`; nunca
  montar esse ID na mão. Leituras são particionadas por mês:
  `leituras/{aptoID}/{tipo}/{AAAA-MM}/{pushId}` (ver `docs/ARQUITETURA.md`).
- **Tarifas (TUSD/TE/IP-CIP)** já vêm "com tributos" (ICMS/PIS/COFINS
  embutidos) — nunca aplicar imposto de novo em cima. Ver
  `docs/TARIFAS-FINANCEIRO.md`.

## Documentação detalhada

- `docs/ARQUITETURA.md` — modelo de dados completo do Firebase, rotas do
  backend, comportamento do firmware ESP32
- `docs/SEGURANCA.md` — auditoria de segurança: o que foi achado, o que já
  foi corrigido, o que ainda está pendente
- `docs/TARIFAS-FINANCEIRO.md` — como tarifa de energia funciona no Brasil,
  o modelo de cálculo implementado, e como validar contra planilhas reais
- `docs/DESIGN-SYSTEM.md` — paleta, tipografia, componentes do dashboard
- `docs/PROXIMOS-PASSOS.md` — lista consolidada do que falta fazer

## Como K trabalha (preferências)

- Comunicação em português informal, direto ao ponto.
- Prefere entender o raciocínio por trás de uma solução, não só receber
  código pronto — ao propor algo não óbvio, vale explicar o porquê em 1-2
  frases.
- Fluxo de trabalho até agora: mudanças validadas com scripts de teste
  isolados (Node, sem framework de teste formal) antes de aplicar no projeto
  real — reproduzir esse padrão quando fizer sentido (testar lógica pura
  sem precisar de rede/Firebase de verdade).
- Gosta de refinamento iterativo: um passo por vez, confirma, segue pro
  próximo.
