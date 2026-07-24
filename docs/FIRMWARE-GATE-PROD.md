# Gate de produção do firmware — TLS validado + OTA + watchdog

> Plano **executável**, guardado pra ser chamado **antes de ir pra produção**.
> Nada aqui está implementado — o firmware de hoje (`firmware/esp.cpp`) é o de
> teste de campo (Modbus real + envio HTTPS com `setInsecure()`). Levantado em
> 2026-07-24. Ver `docs/FIRMWARE.md` pro estado atual e `PROXIMOS-PASSOS.md`
> pro contexto do gate de produção.

## Por que (context)

O firmware já funciona pra teste (Modbus real, envio pro backend, buffer
robusto, diagnóstico). Faltam dois **gates de produção**:

1. **TLS validado** — hoje `client.setInsecure()` criptografa mas **não valida o
   certificado** do backend. Um man-in-the-middle na rede do cliente apresenta
   um cert falso, a ESP aceita, e vaza a chave do dispositivo + as leituras.
   Pinar o CA raiz autentica o servidor e fecha isso.
2. **OTA (atualização remota)** — corrigir firmware em campo sem visita física a
   cada apartamento. Pull-based, por HTTP, **sobre a conexão TLS já validada**
   (baixar firmware inseguro = MITM empurra firmware malicioso, o pior caso).

Incluído também **watchdog + timeouts** (baixo custo): impede a ESP travar muda
se o loop ou um handshake TLS pendurar, e protege o OTA de travar no meio.

**Decisões já tomadas:**
- Provisionamento (WiFiManager, chave por unidade automática) foi **descartado**
  — o instalador configura cada ESP na mão.
- **Ordem obrigatória: TLS antes de OTA** (o download do OTA depende do canal
  validado).
- Como o domínio de produção ainda não existe, o CA fica num ponto configurável
  — dá pra pinar o CA do ngrok e validar o *mecanismo* antes, trocando pelo CA do
  domínio real depois.

## Arquivos a modificar

- `firmware/esp.cpp` — TLS, OTA (cliente), watchdog, timeouts
- `firmware/platformio.ini` — partições dual-OTA
- `backend/routes/espsync.js` — extrair auth de dispositivo + endpoints de OTA
- Backend (novo): pasta de binários (`backend/ota/`) + nó de metadados no Firebase

---

## 1. TLS validado (firmware)

- Adicionar constante `const char *ROOT_CA_PEM = R"(...)";` com o **certificado
  raiz** da CA que assina o cert do backend (PEM). Placeholder até o domínio de
  prod existir — pra testar o mecanismo, pinar o CA raiz do endpoint atual
  (ver Verificação, `openssl s_client`).
- Trocar **os dois** usos de `client.setInsecure()` (envio e, depois, OTA) por
  `client.setCACert(ROOT_CA_PEM)`.
- Garantir **NTP sincronizado antes do handshake** — a validação checa a data de
  validade do cert. Já é garantido no envio (só ocorre com amostra de hora
  válida no buffer), mas o OTA de boot precisa esperar hora válida antes da
  primeira conexão.
- Comentário explícito de que `setInsecure()` NÃO volta pra produção.

## 2. OTA — lado da ESP (firmware)

- `#define FIRMWARE_VERSION "1.0.0"` (versão semântica).
- Incluir `<HTTPUpdate.h>`.
- Função `checarAtualizacao()`:
  1. `GET /esp/firmware/latest` (mesmos headers `x-esp-id`/`x-api-key` +
     `WiFiClientSecure` validado) → JSON `{ versao, url }`.
  2. Se `versao > FIRMWARE_VERSION`, chamar `httpUpdate.update(client, urlDoBin)`
     — baixa no slot OTA inativo e reinicia.
- Disparo: uma vez **no boot** (após wifi + hora válida) e periodicamente via
  timer `OTA_CHECK_INTERVAL` (ex.: 6 h) no `loop()`, no mesmo padrão `millis()`
  dos outros timers, sem bloquear.
- **Rollback**: após o boot da versão nova, só marcar a imagem como válida
  (`esp_ota_mark_app_valid_cancel_rollback()`) depois do **primeiro envio 200
  bem-sucedido**. Se a nova não conecta/envia, o bootloader reverte pro slot
  anterior no próximo boot. Rede de segurança: como o instalador acessa cada ESP
  fisicamente, um brick total ainda é recuperável por regravação serial.
- Reusar o `dumpDiagnostico()` existente pra logar falha de OTA.

## 3. OTA — lado do backend (`backend/routes/espsync.js`)

- **Extrair a auth de dispositivo** hoje inline no `POST /esp/dados` (lê headers,
  valida `dispositivos/{espId}` com chave + `ativo`) para um helper
  `autenticarDispositivo(req)` que devolve o `dispositivo` ou `null`. Reusar no
  POST e nos dois GET novos — evita duplicar a regra de segurança.
- `GET /esp/firmware/latest` — autenticado; lê o nó Firebase `firmwareOTA/latest`
  (`{ versao, arquivo, sha256, ativo }`) e responde `{ versao, url:
  "/esp/firmware/bin" }` (ou 204 se `ativo:false`).
- `GET /esp/firmware/bin` — autenticado; stream do `.bin` de `backend/ota/` com
  `Content-Type: application/octet-stream`. (Opcional: expor `sha256`/MD5 pra ESP
  verificar via `Update.setMD5`.)
- **Publicação de versão** (manual nesta etapa): dropar o `.bin` compilado em
  `backend/ota/` e setar o nó `firmwareOTA/latest`. Rota superadmin pela UI fica
  pra depois.
- Endpoints registrados no `espsync.js` (já montado na raiz em `server.js` —
  mesmo prefixo `/esp`, sem mexer no `server.js`). `backend/ota/*.bin` no
  `.gitignore`.

## 4. Watchdog + timeouts (firmware)

- **Task Watchdog** (`esp_task_wdt`): `init` no `setup()` com timeout **maior que
  a operação bloqueante mais longa** (handshake TLS + POST), ex.: 60–120 s;
  `reset` a cada volta do `loop()`. No callback de progresso do `httpUpdate`,
  alimentar o watchdog (download longo e legítimo — não pode reiniciar no meio).
- **Timeouts explícitos no HTTPClient** de envio: `http.setConnectTimeout(...)` e
  `http.setTimeout(...)` pra o POST não pendurar se o backend sumir no meio.

## 5. `firmware/platformio.ini`

- Adicionar `board_build.partitions = min_spiffs.csv` — esquema **dual-OTA**
  (2 slots de app ~1,9 MB), com folga pro binário maior (mbedTLS + Update). Nota:
  trocar o esquema de partição exige **uma regravação serial manual** (ok — cada
  ESP é gravada na mão na 1ª vez; updates seguintes são OTA).

---

## Verificação

1. **Compilar**: `pio run` na pasta `firmware/` — confirma mbedTLS + HTTPUpdate +
   esp_task_wdt dentro da partição.
2. **Descobrir o CA a pinar** (contra o endpoint atual):
   `openssl s_client -showcerts -connect <host>:443` → copiar o **último**
   certificado da cadeia (o root) pro `ROOT_CA_PEM`.
3. **TLS validado**: flashar, confirmar `HTTP: 200`. Depois trocar o
   `ROOT_CA_PEM` por um errado (ou apontar pra host de outra CA) → a conexão deve
   **falhar** no handshake (prova que valida, não aceita qualquer cert). O
   `dumpDiagnostico` mostra o erro de TLS.
4. **OTA ponta a ponta**: subir `FIRMWARE_VERSION` pra `1.0.1`, compilar, dropar o
   `.bin` em `backend/ota/`, setar `firmwareOTA/latest`. Na ESP em `1.0.0`, forçar
   `checarAtualizacao()` → ver download, reboot e o novo `FIRMWARE_VERSION` no
   boot. Rollback: publicar um `.bin` que não conecta e ver a ESP voltar sozinha.
5. **Watchdog**: simular trava (`while(true)` temporário sem `reset`) e confirmar
   o reboot automático.
6. **Backend**: `GET /esp/firmware/latest` sem headers válidos → 403; com headers
   válidos → JSON da versão.

## Fora de escopo (registrado, não feito)

- Provisionamento/WiFiManager e chave por unidade automática (decisão: config
  manual por ESP).
- **Flash encryption + secure boot** (proteger a chave contra extração física do
  flash) — próximo gate de segurança, separado deste. Relevante porque o aparelho
  fica na casa do cliente.
- Rota superadmin pra publicar versão de OTA pela UI (hoje: publish manual).
