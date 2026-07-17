# Tarifas e módulo financeiro

## Como tarifa de energia funciona no Brasil (resumo da pesquisa)

- **TUSD** (Tarifa de Uso do Sistema de Distribuição) e **TE** (Tarifa de
  Energia) são definidas pela ANEEL por distribuidora, sempre em R$/kWh.
  Desde 2012 aparecem separadas na conta por exigência regulatória.
  Cálculo básico: `valor (R$) = consumo (kWh) × tarifa (R$/kWh)`, pra cada
  uma.
- O valor de tarifa que se usa pra cobrar já é o **"com tributos"**
  (ICMS, PIS, COFINS embutidos) — não aplicar imposto de novo em cima.
- **IP-CIP** (também chamada COSIP) **não é tarifa da ANEEL** — é
  contribuição municipal (art. 149-A da Constituição), cobrada via a conta
  de luz por convênio com a distribuidora, mas definida por lei de cada
  município. A forma de cálculo **varia por cidade**: pode ser percentual
  sobre a tarifa/consumo, faixa fixa por kWh, ou híbrido. Achamos um
  exemplo real (Poços de Caldas) com percentual de 0,25% a 7% dependendo da
  faixa de consumo.
- Consequência prática: **não existe uma fórmula única de IP-CIP que sirva
  pra qualquer cliente/cidade**. O sistema modela hoje como percentual fixo
  sobre TUSD+TE (bate com a planilha real que o K usa), mas o campo foi
  desenhado pra deixar espaço pra outros modos no futuro sem redesenhar o
  banco (`ipCip: { modo: "percentual", percentual: ... }` — um `modo:
  "faixa_kwh"` poderia ser adicionado depois).
- **Bandeira tarifária** (sobretaxa mensal variável por condição
  hidrológica/geração) existe e afeta a conta real, mas **não está
  modelada no sistema hoje** — não estava na planilha de referência do K.
  Extensão futura natural, dado que já se guarda tarifa por competência
  (mês).

## Modelo de dados

```
tarifas/{condominioID}/{competencia}/
  tusd: number              # R$/kWh, com tributos
  te: number                 # R$/kWh, com tributos
  ipCip: { modo: "percentual", percentual: number }
  atualizadoEm: ISO string
  atualizadoPor: uid
```

- **Por condomínio**: condomínios diferentes podem ter distribuidoras
  diferentes.
- **Por competência (AAAA-MM)**: a ANEEL reajusta TUSD/TE ~1x/ano; guardar
  por mês preserva o cálculo histórico correto mesmo depois de um
  reajuste. Formato escolhido de propósito porque comparação de string
  (`"2026-01" < "2026-02"`) já funciona como comparação cronológica.
- **Fallback automático**: se não existe tarifa cadastrada pra competência
  exata, cai pra competência cadastrada mais recente ANTERIOR (não precisa
  recadastrar todo mês se não mudou nada). Lógica em
  `backend/utils/tarifaUtils.js#buscarTarifaVigente`.
- Responsável por cadastrar/editar: **superadmin** (decisão que já vinha
  de conversas anteriores — se isso mudar pra ser por `admin` de cada
  condomínio, é uma troca pequena de `requireRole` nas rotas de tarifa).

## Cálculo do kWh faturado (lida com reinício da ESP)

`valorKWh` nas leituras é **cumulativo** desde que a ESP ligou, nunca
"consumo do instante". Reinício da ESP (queda de energia/wifi, update de
firmware) zera esse contador. Calcular "última leitura menos primeira"
ingenuamente erra quando há reinício no meio do período.

`backend/utils/consumoUtils.js#calcularKwhFaturado` resolve isso: soma os deltas
positivos entre leituras consecutivas; quando o delta é negativo (a
leitura caiu = reinício detectado), soma o valor da leitura atual inteiro
(assume que ela já representa o acumulado desde o reset). Testado com
cenários sintéticos incluindo múltiplos reinícios seguidos — todos batem.

## Fórmula de cobrança

```
valorTUSD   = kwhFaturado × tusd
valorTE     = kwhFaturado × te
valorTUSDTE = valorTUSD + valorTE
valorIPCIP  = valorTUSDTE × ipCipPercentual
valorTotal  = valorTUSDTE + valorIPCIP
```

Validado reproduzindo **exatamente** os valores de uma planilha real do K
(3 apartamentos, tarifas reais TUSD=0.65932127, TE=0.38773756,
IP-CIP=12%) — bateu em todas as colunas (TUSD, TE, TUSD+TE, IP-CIP, total).

Decisão tomada: o sistema mantém **centavos** no total (ex: R$ 134,86) em
vez de arredondar pro real cheio como a planilha de referência mostra (R$
135) — mais correto/auditável pra cobrança real. Arredondar na exibição é
trivial de fazer depois se quiserem esse visual.

## Arquivos

- `backend/utils/consumoUtils.js` — `calcularKwhFaturado(leituras)`
- `backend/utils/tarifaUtils.js` — `buscarTarifaVigente(db, condominioID, competencia)`
- `backend/routes/tarifas.js` — CRUD de tarifas (`POST /tarifas`, `GET /tarifas/:condominioID`), só superadmin
- `backend/routes/financeiro.js` — `GET /financeiro?apartamentoId=&competencia=AAAA-MM`, calcula o boletim completo

## Escopo consciente (não implementado de propósito)

O cálculo hoje fatura só **consumo** (energia da rede). Se algum
apartamento tiver geração própria (solar) e a ideia for abater da conta
(compensação de energia / geração distribuída, REN 482/687 da ANEEL),
isso é uma extensão bem mais complexa (regras próprias de compensação,
"fio B", banco de créditos) que não foi pedida e não está implementada.
