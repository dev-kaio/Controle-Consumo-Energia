# Design system do dashboard

Vive em `frontend/src/styles/` (SPA React): `variables.css` são os
tokens; os componentes ficam quebrados por área (`base`, `layout`,
`dashboard`, `forms`, `tables`, `modal`, `login`). Aplicado em TODAS as
telas. Não renomear seletor sem atualizar o arquivo de style junto.

## Direção

Grounding no domínio: o produto é literalmente um medidor de energia, então
o elemento de assinatura visual é um gauge circular (anel SVG) pro card de
"Potência Atual" — referência a um medidor analógico real, não só estética
genérica de dashboard.

## Tipografia

Achado na auditoria: o CSS antigo declarava fontes (`Orbitron` em
`style.css`, `Inter` em `menu.css`) que **nunca eram importadas** — as
páginas renderizavam com a fonte padrão do navegador. Corrigido:

- **Space Grotesk** (500/600/700) — títulos, números grandes, headings
- **Inter** (400/500/600/700) — corpo, labels, UI. Números usam
  `font-variant-numeric: tabular-nums` pra alinhar (kWh, kW, R$).

Importadas via `<link>` (com preconnect) no `frontend/index.html`.

## Cores

Nenhuma cor nova foi inventada — a paleta que já existia (roxo
`rgb(102, 6, 235)` = consumo/marca, verde `rgb(0, 166, 90)` = autoconsumo,
laranja `rgb(243, 156, 18)` = geração, tons de cinza do dark mode) foi
convertida em variáveis CSS (`:root` + `body.dark`), em vez de valores
repetidos hardcoded em vários arquivos.

```css
--color-bg, --color-surface, --color-surface-alt, --color-border,
--color-text, --color-text-muted, --color-accent, --color-accent-soft,
--color-autoconsumo(-soft), --color-geracao(-soft), --color-danger
```

Definidas em `frontend/src/styles/variables.css` (`:root` + `body.dark`) —
compartilhadas por todas as telas, login incluso.

## Componentes principais

- `.app-header` — barra superior fixa (substituiu os 3 elementos flutuantes
  soltos que existiam antes: menu button, filtro, toggle de tema — agora
  vivem juntos num header coeso)
- `.kpi-card` — card genérico (ícone + label + valor). Modificadores:
  `.kpi-card--gauge`, `.kpi-card--money`, `.kpi-card--consumo`,
  `.kpi-card--autoconsumo`, `.kpi-card--geracao`
- `.gauge` — anel SVG de progresso (círculo completo, não arco parcial —
  escolha deliberada pra matemática ficar simples e confiável sem poder
  testar visualmente num navegador aqui)
- `.tenant-card` — card de inquilino na visão do admin (substituiu estilos
  inline que existiam em `criarCardInquilino` no `grafico.js`)

## O que é placeholder (estrutura pronta, dado ainda não plugado)

- **Card "Potência Atual"** (`#gaugePotenciaFill`, `#valorPotenciaAtual`,
  `#statusPotenciaAtual`) — hoje mostra "—" / "Aguardando dado do medidor".
  Pra plugar dado real: pegar a leitura mais recente de
  `leituras/apto_{id}/consumo` e usar o campo `potencia` (já existe nos
  dados, só falta um endpoint/lógica pra pegar "a leitura mais recente" em
  vez de série histórica). Comentário no HTML explica a matemática do
  círculo (`stroke-dashoffset = circunferência × (1 - percentual)`).
- **Card "Valor da Conta"** (`#valorContaAtual`, `#competenciaContaAtual`)
  — hoje mostra "R$ —,--". Já tem pra onde ir: é exatamente o que
  `GET /financeiro?apartamentoId=&competencia=` calcula (ver
  `docs/TARIFAS-FINANCEIRO.md`). Só falta o fetch no `grafico.js` (ou um
  script próprio) chamando essa rota e preenchendo o card.

## O que já é 100% funcional (não é placeholder)

Os 3 cards de média (consumo/autoconsumo/geração) e o gráfico principal
continuam funcionando com dado real — só ganharam ícones e o novo visual.
A lógica de busca/agrupamento de dados em `grafico.js` não foi alterada,
só a função `criarCardInquilino` (trocou estilo inline por classes CSS,
mesmos dados exibidos).

## Responsivo (mobile é o caso principal, não exceção)

O sistema é usado principalmente no celular. `menu.css` tem três degraus:

- **900px** (tablet): dashboard estreita, médias empilham, gráfico 380px
- **700px** (celular): formulários empilham (um campo por linha, botão em
  largura total), tabelas ganham rolagem horizontal dentro do card
  (`display: block; overflow-x: auto`), inputs sobem pra **16px** (fonte
  menor que isso faz o iOS dar zoom no foco), alvos de toque ≥ 44px
- **480px** (celular pequeno): marca vira só o ⚡, filtro vira painel fixo
  em largura total, gauge encolhe pra 68px

Extras de toque: `-webkit-tap-highlight-color: transparent`, sidebar fecha
ao tocar fora (sidebar.js), e `env(safe-area-inset-*)` no header/sidebar/
dashboard pra celular com notch em modo standalone.

**Nunca testado num navegador de verdade** (ambiente sem renderização) —
validar visualmente antes de confiar 100%.

## PWA

O sistema é instalável como app (Android/iOS/desktop). Manifest e
service worker são GERADOS no build pelo `vite-plugin-pwa` (config no
`frontend/vite.config.js`):

- Manifest: nome, cores da marca (`#6606eb`), ícones 192/512 + maskable
  (gerados por `frontend/scripts/gerar-icones.py` em `public/assets/`),
  `display: standalone`.
- Service worker (Workbox, `autoUpdate`): **API nunca passa pelo cache**
  (fora do precache e com denylist de navegação); shell + estáticos
  ficam no precache com hash (nunca ficam velhos); fontes do Google em
  stale-while-revalidate. Publicar um build novo atualiza os clientes
  sozinho — sem constante de versão pra lembrar de subir.
