# Arquitetura

## Por que ESP32 → Backend → Firebase (e não ESP32 → Firebase direto)

Decisão deliberada, motivada por: centralizar regra de negócio no backend,
controlar custo/carga de escrita no Firebase, e não expor credenciais do
Firebase no firmware. A ESP só conhece o backend (`POST /esp/dados`,
autenticado por header `x-api-key`), nunca o Firebase.

## Modelo de dados no Firebase Realtime Database

```
apartamentos/
  {aptoID}/                    # PADRÃO: "apto_101". Existem registros
    condominioID: string       # legados fora do padrão ("303", "404") —
    predioID: string           # ver "Dívida técnica" abaixo.
    moradores: { uid: true }

condominios/
  {condominioID}/
    nome: string
    localizacao: string
    predios: { predioID: true }

predios/
  {predioID}/
    nome: string
    condominioID: string
    aptos: { aptoID: true }

usuarios/
  {uid}/
    nome, email, tipo (inquilino|admin|superadmin), ativo: bool
    condominioID (se admin/inquilino)
    aptoID (se inquilino)

leituras/
  apto_{aptoID}/
    consumo/
      {pushId}/
        timestamp: ISO string
        valorKWh: number   # CUMULATIVO desde que a ESP ligou, nunca "delta
                            # do instante". Zera quando a ESP reinicia.
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

### `valorKWh` é cumulativo — implicação prática

A ESP acumula `energiaKwh` em RAM e nunca zera sozinha, exceto em reinício
(queda de energia/wifi, atualização de firmware). Calcular consumo de um
período **não é** "última leitura menos primeira" ingenuamente — se houve
reinício no meio, isso subestima (ou dá negativo). A função
`utils/consumoUtils.js#calcularKwhFaturado` já trata isso somando deltas
positivos e tratando quedas como reinício (soma o valor pós-reset inteiro).
Ver `docs/TARIFAS-FINANCEIRO.md` para detalhes e os testes que validam isso.

### Dívida técnica conhecida: IDs de apartamento inconsistentes

O banco tem apartamentos cadastrados como `"303"`/`"404"` (sem prefixo,
sem `predioID`) ao lado de `"apto_101"` (com prefixo e `predioID`). As
rotas de backend (`routes/firebase.js`, `routes/financeiro.js`) sempre
assumem o padrão `leituras/apto_{id}/...`. Isso significa que os
registros legados fora do padrão **não batem** com nenhuma leitura — não dá
erro, só retorna vazio silenciosamente. Precisa de uma migração/padronização
antes de depender desses registros antigos.

## Firmware ESP32 (`esp.cpp`)

- Leitura Modbus: hoje **substituída por simulação** para testes de
  integração (potência/corrente/energia geradas por `random()`).
- Buffer circular: `MAX_SAMPLES = 6`, uma amostra a cada 10s, envio a cada
  `SEND_INTERVAL = 60000` ms (1 min) — isso diverge de uma referência
  antiga de "5 min" que pode aparecer em anotações mais velhas; o código
  atual manda a cada 1 min. Confirmar qual é o comportamento desejado antes
  de assumir um dos dois.
- `x-api-key` estava hardcoded como `"123456"` no firmware — placeholder
  fraco, pendente de correção (ver `docs/SEGURANCA.md`).
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
| `/firebase/consumo` \| `/autoconsumo` \| `/geracao` | GET | `authenticateToken` (inquilino só vê o próprio apto) | Séries de leitura por tipo, filtradas por período |
| `/esp/dados` | POST | header `x-api-key` | Recebe lote de leituras da ESP32 |
| `/tarifas` | POST | `requireRole("superadmin")` | Cria/atualiza tarifa de um condomínio/competência |
| `/tarifas/:condominioID` | GET | `requireRole("superadmin")` | Lista tarifas cadastradas de um condomínio |
| `/financeiro` | GET | `authenticateToken` (inquilino só vê o próprio apto) | Calcula TUSD/TE/IP-CIP/total de um apto numa competência |

## Frontend — páginas e o que cada uma depende

- `public/pages/menu.html` — dashboard do admin (link pra gestão de
  inquilinos + superadmin condicional)
- `public/pages/menu-inquilino.html` — dashboard do inquilino (mesma base,
  sem os links de gestão)
- `public/pages/admin.html` — gestão de inquilinos (**ainda não recebeu o
  mesmo tratamento visual que `menu.html`/`menu-inquilino.html`**)
- `public/pages/superadmin.html` — cadastro de usuários + (futuro) painel
  de tarifas
- `public/js/grafico.js` — o "cérebro" do dashboard: busca dados, monta o
  gráfico Chart.js, alterna layout gráfico/lista, calcula médias. Compartilhado
  entre `menu.html` e `menu-inquilino.html` (detecta qual página é pelo
  `window.location.pathname`).
- `public/js/sidebar.js` / `public/js/tema.js` — sidebar deslizante e tema
  claro/escuro, usados em quase toda página autenticada. **Não renomear
  os IDs que eles usam sem atualizar os dois juntos.**
