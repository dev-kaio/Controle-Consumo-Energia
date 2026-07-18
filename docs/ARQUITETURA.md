# Arquitetura

## Por que ESP32 → Backend → Firebase (e não ESP32 → Firebase direto)

Decisão deliberada, motivada por: centralizar regra de negócio no backend,
controlar custo/carga de escrita no Firebase, e não expor credenciais do
Firebase no firmware. A ESP só conhece o backend (`POST /esp/dados`,
autenticada pelos headers `x-esp-id` + `x-api-key` do cadastro do
dispositivo), nunca o Firebase.

## Hierarquia de acesso (modelo de negócio)

O dono do sistema (superadmin) vende para condomínios. Cada condomínio tem
seu(s) admin(s) — síndico/administradora — que só enxergam e gerenciam o
próprio condomínio. Inquilino só enxerga o próprio apartamento.

- **superadmin**: acesso global. Onboarding de cliente novo: cria o
  condomínio e o primeiro admin. Gerencia tarifas.
- **admin**: cadastra prédios, apartamentos, dispositivos e inquilinos —
  sempre limitado ao próprio condomínio (o `condominioID` vem do token,
  nunca do body).
- **inquilino**: só leitura do próprio apartamento.

## Modelo de dados no Firebase Realtime Database

IDs de apartamento são **compostos**: `condominio-predio-numero`
(ex: `sol-blocoA-101`). Único por construção — dois condomínios podem ter
apto 101 sem colisão — e o próprio ID já diz a quem pertence. Cada segmento
aceita só letras e números (o hífen é o separador); validação em
`backend/utils/idUtils.js`.

```
condominios/
  {condominioID}/              # slug curto, ex "sol"
    nome, localizacao, ativo, criadoEm
    predios/
      {predioID}/              # ex "blocoA"
        nome: string

apartamentos/
  {aptoID}/                    # composto: "sol-blocoA-101"
    condominioID: "sol"        # cópia de conveniência p/ query;
    predioID: "blocoA"         # imutável após criação
    numero: "101"              # só para exibição

usuarios/
  {uid}/
    nome, email, tipo (inquilino|admin|superadmin), ativo: bool
    condominioID (se admin/inquilino)
    aptoID (se inquilino)      # ÚNICA fonte da relação morador↔apto
                               # (não existe mais mapa "moradores")

dispositivos/
  {espId}/                     # ex "esp001" — vincula uma ESP a um apto
    chave: string              # gerada no cadastro; a ESP manda em x-api-key
    aptoID, condominioID, predioID
    ativo: bool                # false = ESP revogada, backend rejeita
    criadoEm

leituras/
  {aptoID}/
    consumo/
      {AAAA-MM}/               # PARTIÇÃO MENSAL — consultas leem só os
        {pushId}/              # meses do intervalo pedido
          timestamp: ISO string
          valorKWh: number   # CUMULATIVO desde que a ESP ligou, nunca
                             # "delta do instante". Zera quando reinicia.
          potencia: number   # W, leitura instantânea
          corrente: number   # A, leitura instantânea
    autoconsumo/ { ... mesma estrutura }
    geracao/     { ... mesma estrutura }

tarifas/
  {condominioID}/
    {competencia}/          # formato "AAAA-MM", ex "2026-01"
      tusd: number           # R$/kWh, com tributos
      te: number              # R$/kWh, com tributos
      ipCip: { modo: "percentual", percentual: number }
      atualizadoEm, atualizadoPor
```

### Decisões de modelagem (o porquê)

- **Partição mensal das leituras**: com 1 leitura/min são dezenas de
  milhares de registros/mês por apto. Sem partição, qualquer consulta
  baixava o histórico inteiro. Com ela, "julho" lê só o nó `2026-07`, e o
  fechamento de fatura lê exatamente 2 nós (competência + última leitura do
  mês anterior como baseline).
- **Uma fonte de verdade por relação**: a versão antiga guardava a mesma
  relação em 4 lugares (`condominios.predios`, `predios.condominioID`,
  `predios.aptos`, `moradores`...) e os fluxos de escrita só atualizavam
  alguns — receita de dado inconsistente. Agora: prédio vive dentro do
  condomínio, apto aponta pro prédio/condomínio, morador é `usuarios.aptoID`.
- **Dispositivo separado do apartamento**: o firmware não sabe de
  apartamento; ele se identifica (`x-esp-id` + chave própria) e o backend
  resolve o apto pelo cadastro. Trocar ESP de apto = editar 1 campo.
  Revogar uma ESP (`ativo: false`) não afeta as outras — a antiga
  `ESP_KEY` global única não permitia isso.

### Seed do banco de teste

`npm run seed -- --confirmo` (ou `node backend/scripts/seed.js --confirmo`) apaga
os nós de dados e recria: condomínio `sol` (blocoA/blocoB), 6 aptos,
usuários de teste (`super@teste.com`, `admin.sol@teste.com`,
`ana@teste.com`, `bruno@teste.com` — senha `palm123`), dispositivos com
chaves impressas no console, tarifa do mês e ~7 dias de leituras simuladas.

### `valorKWh` é cumulativo — implicação prática

A ESP acumula `energiaKwh` em RAM e nunca zera sozinha, exceto em reinício
(queda de energia/wifi, atualização de firmware). Calcular consumo de um
período **não é** "última leitura menos primeira" ingenuamente — se houve
reinício no meio, isso subestima (ou dá negativo). A função
`backend/utils/consumoUtils.js#calcularKwhFaturado` já trata isso somando deltas
positivos e tratando quedas como reinício (soma o valor pós-reset inteiro).
Ver `docs/TARIFAS-FINANCEIRO.md` para detalhes e os testes que validam isso.

## Firmware ESP32 (`firmware/esp.cpp`)

- Leitura Modbus: hoje **substituída por simulação** para testes de
  integração (potência/corrente/energia geradas por `random()`).
- Buffer circular: `MAX_SAMPLES = 6`, uma amostra a cada 10s, envio a cada
  `SEND_INTERVAL = 60000` ms (1 min) — isso diverge de uma referência
  antiga de "5 min" que pode aparecer em anotações mais velhas; o código
  atual manda a cada 1 min. Confirmar qual é o comportamento desejado antes
  de assumir um dos dois.
- Identidade: o firmware carrega `espId` + `espChave` (gerada no cadastro
  do dispositivo) e manda nos headers `x-esp-id`/`x-api-key`. Não sabe de
  apartamento — o backend resolve pelo nó `dispositivos/{espId}`.
- `HTTPClient` usa `http://` puro (sem TLS). Aceitável em rede doméstica de
  teste; **precisa virar HTTPS antes de qualquer deploy real** (AWS ou
  outro), senão a key e os dados trafegam sem criptografia.
- Buffer local só é limpo após receber HTTP 200 do backend (retry-safe).

## Mapa de rotas do backend

| Rota | Método | Proteção | O que faz |
|---|---|---|---|
| `/auth/role` | POST | `authenticateToken` | Sincroniza custom claims do token com `usuarios/{uid}/tipo` (nunca confia em `tipo` vindo do body — ver SEGURANCA.md) |
| `/usuarios/criar` | POST | admin/superadmin | Cria usuário (Firebase Auth + `usuarios/{uid}`) |
| `/superadmin/usuarios` | GET | `requireRole("superadmin")` | Lista usuários com campos sensíveis removidos |
| `/superadmin/condominios` | GET | `requireRole("superadmin")` | Lista condomínios |
| `/superadmin/atualizar` | POST/PUT | `requireRole("superadmin")` | Atualiza usuário (bloqueia setar `tipo: superadmin` por aqui) |
| `/firebase/consumo` \| `/autoconsumo` \| `/geracao` | GET | `authenticateToken` (inquilino só o próprio apto; admin só o próprio condomínio) | Séries de leitura por tipo, filtradas por período (lê só as partições mensais necessárias) |
| `/usuarios/listar` | GET | admin/superadmin | Lista inquilinos (admin: só do seu condomínio) |
| `/usuarios/atualizar` \| `/deletar` | POST | admin/superadmin | Whitelist de campos; admin limitado a inquilinos do próprio condomínio |
| `/estrutura/condominios` | POST superadmin / GET admin+superadmin | claims | Onboarding de condomínio; listagem escopada |
| `/estrutura/predios` | POST | admin/superadmin | Cria prédio dentro do condomínio |
| `/estrutura/apartamentos` | POST/GET | admin/superadmin | Cria/lista aptos (ID composto validado) |
| `/estrutura/dispositivos` | POST/GET | admin/superadmin | Vincula ESP a apto e gera a chave (mostrada só na criação; GET não expõe chave) |
| `/esp/dados` | POST | headers `x-esp-id` + `x-api-key` (chave do dispositivo) | Recebe lote de leituras da ESP32 e grava na partição mensal |
| `/tarifas` | POST | `requireRole("superadmin")` | Cria/atualiza tarifa de um condomínio/competência |
| `/tarifas/:condominioID` | GET | `requireRole("superadmin")` | Lista tarifas cadastradas de um condomínio |
| `/financeiro` | GET | `authenticateToken` (inquilino só vê o próprio apto) | Calcula TUSD/TE/IP-CIP/total de um apto numa competência |

## Frontend — SPA React

O frontend é um SPA React (Vite) — mapa de pastas completo em
`frontend/README.md`. O essencial pra arquitetura:

- **Rotas** (`frontend/src/App.jsx`): `/` login, `/dashboard` (mesma
  página pra admin e inquilino, parametrizada pela role + `?aptoID=`),
  `/inquilinos`, `/estrutura`, `/superadmin`, `/config`. Proteção por
  papel via `RequireRole` (as claims continuam sendo a fonte, via
  POST /auth/role no restore da sessão).
- **Dados**: toda chamada HTTP mora em `frontend/src/api/` (o token vai
  no header em `api/http.js`). O Firebase client SDK é usado SÓ pra
  autenticação (`frontend/src/auth/firebase.js`).
- **Dashboard**: `hooks/useConsumo.js` busca os 3 tipos em paralelo e
  agrega com as funções puras de `utils/agregacao.js` (chave numérica
  de tempo; testadas com `npm test`).
- **Servir em produção**: `npm run build` gera `frontend/dist`; o
  backend serve o dist com fallback SPA (qualquer GET desconhecido →
  index.html, pro F5 em `/dashboard` funcionar). Em dev, servidor do
  Vite (:5173) com proxy pro backend (:3000) — rota nova no backend
  exige o prefixo no proxy do `vite.config.js`.
