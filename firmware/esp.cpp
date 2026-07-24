#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> // HTTPS (ngrok só expõe https)
#include <ArduinoJson.h> // n esquecer de instalar a biblioteca ArduinoJson
#include <time.h>

#include <ModbusMaster.h>    // lib 4-20ma/ModbusMaster
#include <SoftwareSerial.h>  // lib plerup/EspSoftwareSerial

// WIFI
const char *ssid = "";
const char *password = "";

// TESTE via ngrok. A URL muda a cada restart do ngrok (plano free sem domínio
// estático) — se mudar, trocar aqui. Tem que ser https:// — o ngrok redireciona
// http pra https e o cliente não segue.
const char *serverUrl = "https://sustainer-thickness-enhance.ngrok-free.dev/esp/dados";

// IDENTIDADE DO DISPOSITIVO
// A ESP não sabe de apartamento: ela se identifica com o próprio id e a
// chave gerada no cadastro (POST /estrutura/dispositivos, ou seed). O
// backend resolve o apartamento pelo cadastro em dispositivos/{espId}.
const char *espId = "teste00";
// Chave do dispositivo cadastrado na Estrutura pro teste de campo.
// Tem que bater com dispositivos/{espId}.chave no banco. NÃO usar em produção.
const char *espChave = "61708bed7a13aa664d5106bc210b3bdae827ca81484b1960";

// MODBUS
// Medidor lido via RS485 (MAX485). Parâmetros e mapa de registradores vêm do
// medidor real — ver espElvis/src/dados.h pro mapa completo (v/a/w por fase,
// energia consumida/gerada). Confirmar endereço/pinos antes de campo.
#define MODBUS_DIR_PIN 18 // pino DE/RE do MAX485
#define MODBUS_ADDR 11    // endereço Modbus do medidor

SoftwareSerial SerialMod(15, 4); // RO, DI
ModbusMaster node;

// Registradores (input registers, 2 words = float32)
#define REG_CORRENTE 0x0006 // a11 — corrente fase 1 (A)
#define REG_POTENCIA 0x000C // w11 — potência ativa (W)
#define REG_ENERGIA 0x0048  // etc1 — energia total consumida (Wh)

// INTERVALOS
#define READ_INTERVAL 1000
#define SAMPLE_INTERVAL 10000
#define SEND_INTERVAL 60000
#define WIFI_RETRY_INTERVAL 10000 // tentativa de reconexão

unsigned long lastReadTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastSendTime = 0;
unsigned long lastWifiTry = 0;

// BUFFER
// Ring buffer: quando cheio, sobrescreve a amostra MAIS ANTIGA (não descarta a
// nova). Como "valor" é o kWh acumulado do medidor, perder amostras antigas
// numa queda de rede custa só resolução do gráfico — nunca o total. Folga de
// vários ciclos de envio (30 × 10s = 5 min) pra aguentar wifi fora sem buraco.
#define MAX_SAMPLES 30

float bufferKwh[MAX_SAMPLES];
float bufferPotencia[MAX_SAMPLES];
float bufferCorrente[MAX_SAMPLES];
String bufferTimestamps[MAX_SAMPLES];
int bufferHead = 0;  // posição da próxima escrita
int bufferCount = 0; // quantas amostras válidas há no buffer

// VARIÁVEIS de energia REAL (lidas do medidor)
float correnteA = NAN;
float potenciaWatts = NAN;
float energiaKwh = NAN;

// DIAGNÓSTICO — estado guardado pro dump de erro (ver dumpDiagnostico)
int ultimoErroModbus = 0;         // último code de erro do Modbus (0 = ok)
int ultimoHttpCode = 0;           // último status HTTP (0 = nunca enviou)
String ultimoHttpErro = "";       // texto do erro de conexão ou resposta do backend
unsigned long ultimoEnvioOk = 0;  // millis() do último HTTP 200

// ========================
// Controle MAX485
// ========================
void preTransmission()
{
  delay(100);
  digitalWrite(MODBUS_DIR_PIN, HIGH);
}

void postTransmission()
{
  digitalWrite(MODBUS_DIR_PIN, LOW);
  delay(100);
}

// ========================
// Conversão Modbus (2 words → float32, high word primeiro)
// ========================
float reform_uint16_2_float32(uint16_t u1, uint16_t u2)
{
  uint32_t num = ((uint32_t)u1 << 16) | u2;
  float f;
  memcpy(&f, &num, sizeof(f));
  return f;
}

float readModbusFloat(uint16_t address)
{
  uint8_t result = node.readInputRegisters(address, 2);
  if (result == node.ku8MBSuccess)
  {
    ultimoErroModbus = 0;
    return reform_uint16_2_float32(
        node.getResponseBuffer(0),
        node.getResponseBuffer(1));
  }
  ultimoErroModbus = result;
  Serial.print("Erro Modbus 0x");
  Serial.print(address, HEX);
  Serial.print(" code: ");
  Serial.println(result);

  return NAN;
}

// TIMESTAMP
// Retorna string vazia quando o NTP ainda não sincronizou. Chamador usa isso
// pra NÃO bufferizar a amostra — evita carimbar a época Unix (1970) no banco.
String getTimestampISO()
{
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
  {
    return String("");
  }

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// WIFI — reconexão não-bloqueante no loop
void manterWifi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  unsigned long now = millis();
  if (now - lastWifiTry < WIFI_RETRY_INTERVAL)
    return;

  lastWifiTry = now;
  Serial.println("WiFi caiu — tentando reconectar...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);
}

// DIAGNÓSTICO
// Bloco pra COPIAR E MANDAR quando algo falha: junta tudo que diz ONDE quebrou
// (wifi, hora/NTP, Modbus, backend, buffer) num pedaço só do serial.
void dumpDiagnostico(const char *motivo)
{
  Serial.println();
  Serial.println("========== DIAGNOSTICO (copie deste bloco todo) ==========");
  Serial.print("Motivo: ");
  Serial.println(motivo);
  Serial.print("Uptime (s): ");
  Serial.println(millis() / 1000);

  // WiFi
  Serial.print("WiFi: ");
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("conectado a '");
    Serial.print(WiFi.SSID());
    Serial.print("' | IP ");
    Serial.print(WiFi.localIP());
    Serial.print(" | RSSI ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  else
  {
    Serial.print("DESCONECTADO (status ");
    Serial.print(WiFi.status());
    Serial.println(")");
  }

  // Hora / NTP
  Serial.print("Hora NTP: ");
  String ts = getTimestampISO();
  Serial.println(ts.length() ? ts : String("INVALIDA (NTP nao sincronizou)"));

  // Modbus — última leitura e último erro
  Serial.print("Modbus ultima leitura -> A: ");
  Serial.print(correnteA);
  Serial.print(" | W: ");
  Serial.print(potenciaWatts);
  Serial.print(" | kWh: ");
  Serial.println(energiaKwh, 6);
  Serial.print("Modbus ultimo erro: ");
  if (ultimoErroModbus == 0)
    Serial.println("nenhum (0)");
  else
  {
    Serial.print("0x");
    Serial.print(ultimoErroModbus, HEX);
    Serial.println(" -> leitura falhou (checar fiacao RS485, MODBUS_ADDR, baud)");
  }

  // Backend
  Serial.print("Endpoint: ");
  Serial.println(serverUrl);
  Serial.print("espId: ");
  Serial.println(espId);
  Serial.print("Ultimo HTTP code: ");
  Serial.println(ultimoHttpCode);
  if (ultimoHttpErro.length())
  {
    Serial.print("Detalhe HTTP: ");
    Serial.println(ultimoHttpErro);
  }
  Serial.print("Segundos desde ultimo envio OK: ");
  Serial.println(ultimoEnvioOk ? String((millis() - ultimoEnvioOk) / 1000) : String("nunca"));

  // Buffer
  Serial.print("Amostras no buffer: ");
  Serial.print(bufferCount);
  Serial.print("/");
  Serial.println(MAX_SAMPLES);

  Serial.println("==========================================================");
  Serial.println();
}

// ENVIO
void enviarParaBackend()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    dumpDiagnostico("Envio pulado: WiFi desconectado");
    return;
  }
  if (bufferCount == 0)
    return;

  JsonDocument doc;

  JsonArray arr = doc["leituras"].to<JsonArray>();

  // Percorre o ring do mais antigo pro mais novo
  int start = (bufferHead - bufferCount + MAX_SAMPLES) % MAX_SAMPLES;
  for (int n = 0; n < bufferCount; n++)
  {
    int i = (start + n) % MAX_SAMPLES;
    JsonObject item = arr.add<JsonObject>();
    item["timestamp"] = bufferTimestamps[i];
    item["valor"] = bufferKwh[i]; // kWh acumulado (número — o backend exige)
    // potência/corrente podem faltar (erro Modbus) → null, o backend aceita
    if (!isnan(bufferPotencia[i]))
      item["potencia"] = bufferPotencia[i];
    else
      item["potencia"] = nullptr;
    if (!isnan(bufferCorrente[i]))
      item["corrente"] = bufferCorrente[i];
    else
      item["corrente"] = nullptr;
  }

  String json;
  serializeJson(doc, json);

  Serial.println("Enviando:");
  Serial.println(json);

  // HTTPS pro ngrok. setInsecure() = não valida o certificado — aceitável SÓ
  // pra teste (casa com o item #4 do docs/FIRMWARE.md); em produção, pinar o CA.
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp-id", espId);
  http.addHeader("x-api-key", espChave);
  http.addHeader("ngrok-skip-browser-warning", "true"); // pula a página de aviso do ngrok free

  int httpCode = http.POST(json);
  ultimoHttpCode = httpCode;

  Serial.print("HTTP: ");
  Serial.println(httpCode);

  // Buffer só é limpo em 200 — se falhar, o lote fica e vai na próxima
  if (httpCode == 200)
  {
    ultimoHttpErro = "";
    ultimoEnvioOk = millis();
    bufferCount = 0;
    bufferHead = 0;
  }
  else
  {
    // httpCode < 0 = erro de conexão/TLS (texto da lib); >= 400 = corpo da resposta do backend
    ultimoHttpErro = (httpCode < 0)
                         ? HTTPClient::errorToString(httpCode)
                         : http.getString();
    dumpDiagnostico("Falha ao enviar lote pro backend");
  }

  http.end();
}

void setup()
{
  Serial.begin(115200);

  // Modbus / MAX485
  pinMode(MODBUS_DIR_PIN, OUTPUT);
  digitalWrite(MODBUS_DIR_PIN, LOW);

  SerialMod.begin(9600);
  delay(2000);

  node.begin(MODBUS_ADDR, SerialMod);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  delay(3000);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado!");

  configTime(0, 0, "pool.ntp.org");
}

void loop()
{
  unsigned long now = millis();

  manterWifi();

  // LEITURA (1s) — medidor real via Modbus
  if (now - lastReadTime >= READ_INTERVAL)
  {
    lastReadTime = now;

    correnteA = readModbusFloat(REG_CORRENTE);
    potenciaWatts = readModbusFloat(REG_POTENCIA);
    energiaKwh = readModbusFloat(REG_ENERGIA) / 1000.0; // Wh → kWh

    Serial.print("A: ");
    Serial.print(correnteA);
    Serial.print(" | W: ");
    Serial.print(potenciaWatts);
    Serial.print(" | kWh: ");
    Serial.println(energiaKwh, 6);
  }

  // AMOSTRA (10s)
  if (now - lastSampleTime >= SAMPLE_INTERVAL)
  {
    lastSampleTime = now;

    String ts = getTimestampISO();

    // Sem hora válida (NTP não sincronizou) → não bufferiza, evita 1970 no banco
    if (ts.length() == 0)
    {
      Serial.println("Amostra ignorada: hora ainda inválida");
    }
    // Sem energia válida → inútil pro backend (valor precisa ser número)
    else if (isnan(energiaKwh))
    {
      Serial.println("Amostra ignorada: leitura de energia inválida (NaN)");
    }
    else
    {
      bufferKwh[bufferHead] = energiaKwh;
      bufferPotencia[bufferHead] = potenciaWatts;
      bufferCorrente[bufferHead] = correnteA;
      bufferTimestamps[bufferHead] = ts;

      bufferHead = (bufferHead + 1) % MAX_SAMPLES;
      if (bufferCount < MAX_SAMPLES)
        bufferCount++;
      else
        Serial.println("Buffer cheio — sobrescrevendo amostra mais antiga");

      Serial.println("Amostra salva");
    }
  }

  // ENVIO (60s)
  if (now - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = now;
    enviarParaBackend();
  }
}
