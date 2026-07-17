# Palm Energy

Sistema de monitoramento e faturamento de energia para condomínios (medição
individualizada por apartamento). Projeto em desenvolvimento, com intenção de
virar produto comercial vendido a clientes reais (síndicos/administradoras).

## Stack

- **Backend:** Node.js + Express, Firebase Admin SDK (Realtime Database)
- **Frontend:** HTML + JS puro (sem framework/bundler), Chart.js via CDN
- **Firmware:** ESP32 (`esp.cpp`), leitura Modbus (hoje simulada em testes),
  envia lotes via HTTP para o backend a cada ~60s
- **Auth:** Firebase Authentication + custom claims (`role`, `condominioID`,
  `predioID`, `apartamentoId`)

## Arquitetura em uma frase

`ESP32 → Backend (Express) → Firebase`. A ESP nunca fala com o Firebase
direto — isso é proposital (ver `docs/ARQUITETURA.md`). O frontend também
deve preferir sempre passar pelo backend em vez de ler o Firebase client SDK
direto (isso já foi corrigido no superadmin, mas ainda existe em
`grafico.js` para a lista de usuários — ver `docs/SEGURANCA.md`).

## Papéis (roles)

`inquilino` (mora em 1 apto) → `admin` (gerencia 1 condomínio) → `superadmin`
(acesso global, gerencia tarifas). Definidos via custom claims no token do
Firebase Auth, aplicados pelo middleware `authenticateToken`/`requireRole`
em `routes/requires.js`.

## Regras que não podem ser quebradas sem avisar

- **Nunca reintroduzir** os bugs de segurança já corrigidos — ver
  `docs/SEGURANCA.md` antes de mexer em `routes/auth.js`, `routes/requires.js`
  ou `routes/firebase.js`.
- **Preservar** o contrato de `public/js/sidebar.js` e `public/js/tema.js`:
  IDs `menuBtn`, `sidebar`, `filterBtn`, `filterMenu`, `themeToggle`,
  `superadminLink`, e as classes `.active` (sidebar) e `.dark` (body) não
  podem ser renomeados sem atualizar esses dois arquivos junto.
- **IDs de apartamento** são compostos: `condominio-predio-numero`
  (ex: `sol-blocoA-101`). Cada segmento só aceita letras e números — o
  hífen é o separador. Validação/montagem em `utils/idUtils.js`; nunca
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
