# Firmware ESP32 (`firmware/esp.cpp`)

> Documento separado porque o firmware é o único pedaço do sistema que ainda
> é **base incompleta** — o resto (backend, frontend) está em estado de
> produto. Aqui mora o que o código faz hoje, o contrato que ele já cumpre
> com o backend, e a lista de coisas a resolver antes de encostar num
> medidor real. Levantado em 2026-07-22.

## O papel da ESP em uma frase

Ler o medidor de um apartamento e empurrar as leituras pro backend por HTTP.
**Ela não fala com o Firebase** e **não sabe de apartamento** — se identifica
com o próprio id + chave, e o backend resolve o resto (ver
`docs/ARQUITETURA.md`, seção "Por que ESP32 → Backend → Firebase").

## Como o código está hoje

### Os três timers

Tudo acontece no `loop()`, em três cadências empilhadas:

| Intervalo | Constante | O que faz |
|---|---|---|
| 1 s | `READ_INTERVAL` | lê a potência instantânea (W) e integra o acumulado de energia |
| 10 s | `SAMPLE_INTERVAL` | congela uma amostra no buffer |
| 60 s | `SEND_INTERVAL` | POST do lote pro backend |

A integração de energia é `energiaKwh += (potenciaWatts * 1.0) / 3600000.0`
— potência em watts × 1 segundo, convertido pra kWh (1 W·s = 1/3.600.000 kWh).

### A leitura é simulada

Não existe Modbus no código ainda. `potenciaWatts` começa em 100.0 e caminha
por `random(-5, 10) * 0.1` a cada segundo (viés positivo de propósito, pra
subir devagar). A corrente é derivada, não medida: `potenciaWatts / 220.0`.

Isso é suficiente pra exercitar o caminho ESP → backend → Firebase → gráfico
de ponta a ponta, que é pra isso que existe.

### O buffer

```c
#define MAX_SAMPLES 6
float bufferKwh[MAX_SAMPLES];
float bufferPotencia[MAX_SAMPLES];
float bufferCorrente[MAX_SAMPLES];
String bufferTimestamps[MAX_SAMPLES];
int bufferIndex = 0;
```

Quatro arrays paralelos indexados por `bufferIndex`. O índice só volta a zero
quando o POST devolve **HTTP 200** — se o envio falha, o lote fica guardado e
vai junto na próxima tentativa.

> **Correção de doc antiga:** já foi descrito como "buffer circular". Não é.
> É um buffer linear que **para de aceitar** quando enche (`if (bufferIndex <
> MAX_SAMPLES)`), em vez de sobrescrever o mais velho. Ver o problema #1
> abaixo.

### O que ela manda

```
POST http://<backend>:3000/esp/dados
x-esp-id:      esp001
x-api-key:     <chave gerada no cadastro do dispositivo>
Content-Type:  application/json

{
  "leituras": [
    {
      "timestamp": "2026-07-22T14:03:10Z",   // ISO 8601, UTC
      "valor":     12.4831,                   // kWh ACUMULADO (não é delta!)
      "potencia":  347.2,                     // W, instantânea
      "corrente":  1.58                       // A, instantânea
    }
    // ... até 6 itens
  ]
}
```

### O que o backend faz com isso

`backend/routes/espsync.js` valida `dispositivos/{espId}` (chave confere +
`ativo: true`), descobre o `aptoID` pelo cadastro, e grava cada item em:

```
leituras/{aptoID}/consumo/{AAAA-MM}/{pushId}
  timestamp, valorKWh, potencia, corrente
```

Repare no rename: a ESP manda `valor`, o banco guarda `valorKWh`. Itens sem
timestamp válido ou com `valor` que não seja número são **descartados em
silêncio** (`continue` na linha 41) — a resposta `{ok:true, gravadas:N}` diz
quantos passaram, mas o firmware hoje só olha o status 200 e ignora o `N`.

### `valor` é cumulativo — a implicação

`energiaKwh` vive em RAM e nunca zera sozinho; só volta a ~0 quando a ESP
reinicia (queda de energia, queda de wifi, flash novo). Por isso o consumo de
um período **não é** "última leitura menos primeira" — um reinício no meio
derruba o valor e a conta dá errado, às vezes negativa.

Quem resolve isso é `backend/utils/consumoUtils.js#calcularKwhFaturado`,
somando deltas positivos e tratando queda como reinício. Detalhes em
`docs/TARIFAS-FINANCEIRO.md`.

---

## Problemas conhecidos (a tratar)

### 1. O buffer não tem folga, e perde dado em silêncio

6 amostras × 10 s = exatamente 60 s. O envio também é a cada 60 s. Zero
margem.

O agravante é o comportamento quando enche: a linha 143 é
`if (bufferIndex < MAX_SAMPLES)`, ou seja, com o buffer cheio a amostra nova
é **jogada fora sem aviso**. Como o índice só zera com HTTP 200, qualquer
falha de rede vira buraco na série — wifi fora por 5 minutos = 5 minutos sem
nenhum ponto, mesmo com a ESP funcionando perfeitamente o tempo todo.

O total faturado se recupera (porque `valor` é cumulativo — a próxima leitura
que chegar já traz a energia do período perdido embutida), mas o **gráfico** e
a **potência instantânea** ficam cegos no intervalo.

Caminhos possíveis: aumentar `MAX_SAMPLES` pra dar folga real de vários
ciclos; virar buffer circular de verdade (sobrescrever o mais velho é melhor
que descartar o mais novo); ou os dois.

### 2. Timestamp de 1970 entra no banco

```c
if (!getLocalTime(&timeinfo)) {
  return "1970-01-01T00:00:00Z";
}
```

Se o NTP ainda não sincronizou (normal nos primeiros segundos após o boot, ou
se o `pool.ntp.org` estiver inacessível), a amostra sai carimbada com a época
Unix. O backend aceita: `mesDaData()` devolve `"1970-01"` e a leitura é
gravada em `leituras/{apto}/consumo/1970-01/`.

Resultado: um nó de mês fantasma que nunca aparece em consulta nenhuma
(nenhum filtro cobre 1970) mas fica lá pra sempre. Pior, se cair no meio de
uma série, envenena o cálculo de delta.

Dois lados a resolver: a ESP não deveria amostrar antes de ter hora válida, e
o backend não deveria aceitar timestamp absurdo.

### 3. A integração de energia assume que o loop é perfeito

`energiaKwh += (potenciaWatts * 1.0) / 3600000.0` chuta 1,0 segundo fixo em
vez de usar o tempo real decorrido (`now - lastReadTime`).

Com a leitura simulada isso não importa — o `loop()` roda milhares de vezes
por segundo e o timer dispara pontual. Mas o `http.POST()` **bloqueia**, e uma
leitura Modbus real também bloqueia. Todo tempo gasto ali vira energia não
contabilizada: o intervalo real passa a ser 1,4 s e a conta segue somando como
se fosse 1,0 s. Subfaturamento sistemático, sempre pro mesmo lado.

Vira problema de verdade quando o Modbus entrar.

### 4. `http://` puro, sem TLS

`HTTPClient` sem certificado. A chave do dispositivo e todas as leituras
trafegam em texto claro. Tolerável em rede doméstica de teste; **inaceitável
antes de qualquer cliente real** — é item do gate de produção em
`docs/PROXIMOS-PASSOS.md`.

### 5. Wifi cai e nunca reconecta

O `setup()` trava num `while (WiFi.status() != WL_CONNECTED)` até conectar, o
que resolve o boot. Mas se a rede cair depois, o `loop()` só verifica
`WiFi.status()` dentro do `enviarParaBackend()` e desiste (`return`). Não há
tentativa de reconexão em lugar nenhum — a ESP fica acumulando amostras (que
o problema #1 vai descartar) até alguém tirar da tomada.

### 6. `serverUrl` e credenciais hardcoded

IP fixo (`192.168.0.6`), `ssid`/`password` vazios no repositório, e
`espChave` com placeholder literal. Funciona pra bancada, mas não sobrevive a
mudança de rede nem a mais de uma unidade em campo. Provisionamento (portal
de configuração, ou pelo menos mDNS pro backend) é assunto de quando existir
mais de uma ESP.

---

## Decisões em aberto

### Qual é o intervalo de envio certo?

O código manda a cada **1 minuto**. Anotações mais antigas do projeto falam em
**5 minutos**. Não foi decidido qual vale — e a diferença é grande no volume
de dados (1 min = ~43k leituras/mês/apto; 5 min = ~8,6k).

Vale casar isso com a decisão de `MAX_SAMPLES` do problema #1: intervalo maior
de envio pede buffer proporcionalmente maior, não o mesmo 6.

### `potencia` e `corrente` não chegam no frontend

Não é bug do firmware — é onde o dado dele morre. `espsync.js` grava os dois
campos corretamente, mas `backend/routes/firebase.js` (função
`lerLeiturasDoApto`, ~linha 75) remonta a resposta à mão com apenas
`{timestamp, valorKWh, tipo, aptoID}`. Potência e corrente são descartadas na
saída da API.

Ou seja: o dado de potência **já existe no banco desde sempre**, o card
"Potência atual" do dashboard nunca teve como enxergar. Anotado aqui porque
qualquer conversa sobre "mostrar a potência que vem da ESP" esbarra nisso
primeiro.

### O que falta pra virar firmware de verdade

- Substituir a simulação por leitura **Modbus RTU** do medidor real
- Definir o mapa de registradores do medidor escolhido (qual endereço é
  potência ativa, qual é energia acumulada, qual é corrente)
- Decidir se a energia acumulada vem **do medidor** (que já conta, e não zera
  quando a ESP reinicia) ou continua sendo integrada na ESP. Se vier do
  medidor, o tratamento de reinício do `calcularKwhFaturado` fica só como
  rede de segurança
- Persistir `energiaKwh` em NVS/flash pra sobreviver a reboot, caso a
  integração continue na ESP
