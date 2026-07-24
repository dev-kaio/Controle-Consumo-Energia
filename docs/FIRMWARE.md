# Firmware ESP32 (`firmware/esp.cpp`)

> Documento do firmware da ESP32: o que o código faz, o contrato que cumpre com
> o backend, e o que ainda falta antes de campo. Levantado em 2026-07-22,
> atualizado em 2026-07-23 quando a simulação virou **leitura Modbus real** e
> os problemas de robustez #1, #2, #3 e #5 foram corrigidos.

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
| 1 s | `READ_INTERVAL` | lê corrente, potência e energia acumulada do medidor via Modbus |
| 10 s | `SAMPLE_INTERVAL` | congela uma amostra no buffer |
| 60 s | `SEND_INTERVAL` | POST do lote pro backend |

A energia **não é mais integrada na ESP** — vem acumulada do próprio medidor
(registrador `etc1`), que conta sozinho e não zera quando a ESP reinicia. Isso
eliminou o antigo problema #3 (integração dependente do timing do loop).

### A leitura é Modbus real (RS485)

O medidor é lido por Modbus RTU sobre RS485 (transceiver MAX485), com
`ModbusMaster` + `SoftwareSerial`. A cada 1 s o `loop()` lê três registradores
(input registers, 2 words = float32, high word primeiro):

| Variável | Registrador | Grandeza |
|---|---|---|
| `correnteA` | `0x0006` (a11) | corrente fase 1 (A) |
| `potenciaWatts` | `0x000C` (w11) | potência ativa (W) |
| `energiaKwh` | `0x0048` (etc1) | energia total consumida — medidor entrega em **Wh**, dividido por 1000 |

Parâmetros: `MODBUS_ADDR 11`, pino DE/RE do MAX485 em `MODBUS_DIR_PIN 18`,
`SoftwareSerial(15, 4)` (RO, DI), baud 9600. O mapa completo do medidor
(tensão/corrente/potência por fase, energia consumida e gerada) está em
`espElvis/src/dados.h` no projeto PlatformIO de origem.

> Esses parâmetros vieram do projeto `espElvis`, que rodou no medidor real.
> **Confirmar endereço, pinos e baud contra o medidor de destino** antes de
> instalar em campo — medidor diferente = mapa de registradores diferente.

Se uma leitura Modbus falha, `readModbusFloat()` devolve `NAN` e loga o código
de erro no serial. O tratamento do `NaN` acontece na hora de amostrar (ver
abaixo).

### O buffer (ring buffer)

```c
#define MAX_SAMPLES 30
float bufferKwh[MAX_SAMPLES];
float bufferPotencia[MAX_SAMPLES];
float bufferCorrente[MAX_SAMPLES];
String bufferTimestamps[MAX_SAMPLES];
int bufferHead = 0;   // próxima escrita
int bufferCount = 0;  // amostras válidas no buffer
```

Quatro arrays paralelos em anel. `MAX_SAMPLES 30` × 10 s = **5 minutos de
folga** — bem mais que um ciclo de envio (60 s), pra aguentar wifi fora sem
buraco na série. Quando enche, **sobrescreve a amostra mais antiga** (não
descarta a nova): como `valor` é o kWh acumulado do medidor, a leitura mais
recente é sempre a mais valiosa. O buffer só é limpo (`bufferCount = 0`) quando
o POST devolve **HTTP 200** — se o envio falha, o lote fica guardado e vai
junto na próxima tentativa.

Uma amostra só entra no buffer se passar em dois filtros:

- **hora válida** — se o NTP ainda não sincronizou, `getTimestampISO()` devolve
  string vazia e a amostra é ignorada (nada de timestamp 1970 no banco);
- **energia numérica** — se a leitura de energia (`valor`) veio `NaN`, a amostra
  é descartada (o backend exige que `valor` seja número). `potencia`/`corrente`
  em `NaN` não bloqueiam: vão como `null` no JSON.

### O que ela manda

```
POST http://<backend>:3000/esp/dados
x-esp-id:      esp001
x-api-key:     <chave gerada no cadastro do dispositivo>
Content-Type:  application/json

{
  "leituras": [
    {
      "timestamp": "2026-07-23T14:03:10Z",   // ISO 8601, UTC
      "valor":     12.4831,                   // kWh ACUMULADO (não é delta!)
      "potencia":  347.2,                     // W, instantânea (ou null)
      "corrente":  1.58                       // A, instantânea (ou null)
    }
    // ... até MAX_SAMPLES itens
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

`energiaKwh` agora vem do medidor, que **não zera** quando a ESP reinicia — o
que era o pior caso do modelo antigo (integração em RAM). Ainda assim, o
consumo de um período **não é** "última leitura menos primeira": trocar o
medidor ou zerar o acumulado dele derruba o valor, e a conta ingênua daria
negativa.

Quem trata isso é `backend/utils/consumoUtils.js#calcularKwhFaturado`, somando
deltas positivos e tratando queda como reinício. Com a energia vindo do
medidor, esse tratamento vira **rede de segurança** (raro disparar) em vez de
caminho quente. Detalhes em `docs/TARIFAS-FINANCEIRO.md`.

### Reconexão de wifi

`setup()` bloqueia no boot até conectar. No `loop()`, `manterWifi()` checa a
conexão de forma não-bloqueante e, se caiu, tenta reconectar a cada 10 s
(`WIFI_RETRY_INTERVAL`) sem travar os timers de Modbus/amostra. Enquanto
offline, as amostras continuam entrando no ring buffer e sobem no próximo 200.

---

## Problemas conhecidos

### Resolvidos em 2026-07-23

- **#1 buffer sem folga / perda silenciosa** → agora é ring buffer de 30
  amostras (5 min de folga) que sobrescreve a mais antiga em vez de descartar a
  nova.
- **#2 timestamp 1970** → a ESP não amostra sem hora válida do NTP. *(O lado do
  backend — rejeitar timestamp absurdo — continua pendente, ver abaixo.)*
- **#3 integração dependente do timing** → energia vem acumulada do medidor, não
  é mais integrada na ESP.
- **#5 wifi não reconectava** → `manterWifi()` reconecta no `loop()`.

### 4. `http://` puro, sem TLS *(pendente)*

`HTTPClient` sem certificado. A chave do dispositivo e todas as leituras
trafegam em texto claro. Tolerável em rede doméstica de teste; **inaceitável
antes de qualquer cliente real** — é item do gate de produção em
`docs/PROXIMOS-PASSOS.md`.

### 6. `serverUrl` e credenciais hardcoded *(pendente)*

IP fixo (`192.168.0.6`), `ssid`/`password` vazios no repositório, e
`espChave` com placeholder literal. Funciona pra bancada, mas não sobrevive a
mudança de rede nem a mais de uma unidade em campo. Provisionamento (portal
de configuração, ou pelo menos mDNS pro backend) é assunto de quando existir
mais de uma ESP.

### Backend: aceitar timestamp absurdo *(pendente, complementa o #2)*

A ESP não manda mais 1970, mas `espsync.js`/`mesDaData()` ainda aceitariam um
timestamp fora da faixa se viesse de qualquer fonte. Defesa em profundidade:
rejeitar no backend datas absurdas (muito no passado/futuro).

---

## Decisões

### Resolvidas

- **Fonte da energia acumulada** → vem **do medidor** (`etc1`), não mais
  integrada na ESP. Fecha as duas últimas linhas da antiga lista "o que falta
  pra virar firmware de verdade" (Modbus RTU + energia do medidor), e torna
  desnecessário persistir `energiaKwh` em NVS/flash.

### Em aberto

#### Qual é o intervalo de envio certo?

O código manda a cada **1 minuto**. Anotações mais antigas do projeto falam em
**5 minutos**. Não foi decidido qual vale — e a diferença é grande no volume
de dados (1 min = ~43k leituras/mês/apto; 5 min = ~8,6k). Se o envio for pra 5
min, o `MAX_SAMPLES 30` já dá folga confortável (5 min a 10 s por amostra).

#### `potencia` e `corrente` não chegam no frontend

Não é bug do firmware — é onde o dado dele morre. `espsync.js` grava os dois
campos corretamente, mas `backend/routes/firebase.js` (função
`lerLeiturasDoApto`, ~linha 75) remonta a resposta à mão com apenas
`{timestamp, valorKWh, tipo, aptoID}`. Potência e corrente são descartadas na
saída da API.

Ou seja: o dado de potência **já existe no banco desde sempre**, o card
"Potência atual" do dashboard nunca teve como enxergar. Anotado aqui porque
qualquer conversa sobre "mostrar a potência que vem da ESP" esbarra nisso
primeiro.

---

## Como compilar / flashar

O `firmware/` do repo tem só o `esp.cpp` — **não há `platformio.ini`** aqui. Pra
buildar e gravar, o `esp.cpp` precisa entrar num projeto PlatformIO com as libs:

```ini
lib_deps =
    bblanchon/ArduinoJson
    4-20ma/ModbusMaster
    plerup/EspSoftwareSerial
```

O projeto de origem (`espElvis`) já tem esse setup. Verificação ponta a ponta:
`pio run` (compila), `pio device monitor` a 115200 (ver `A: / W: / kWh:` reais
e o JSON do lote), e o log do backend `ESP <id> → <aptoID>: N leituras
gravadas`.
