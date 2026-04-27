#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // n esquecer de instalar a biblioteca ArduinoJson
#include <time.h>

// WIFI
const char *ssid = "";
const char *password = "";

const char *serverUrl = "http://192.168.0.6:3000/esp/dados";

// INTERVALOS
#define READ_INTERVAL 1000
#define SAMPLE_INTERVAL 10000
#define SEND_INTERVAL 60000

unsigned long lastReadTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastSendTime = 0;

// BUFFER
#define MAX_SAMPLES 6

float bufferKwh[MAX_SAMPLES];
float bufferPotencia[MAX_SAMPLES];
float bufferCorrente[MAX_SAMPLES];
String bufferTimestamps[MAX_SAMPLES];
int bufferIndex = 0;

// VARIÁVEIS
float potenciaWatts = 100.0;
float energiaKwh = 0.0;

// TIMESTAMP
String getTimestampISO()
{
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
  {
    return "1970-01-01T00:00:00Z";
  }

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// ENVIO
void enviarParaBackend()
{
  if (WiFi.status() != WL_CONNECTED || bufferIndex == 0)
    return;

  JsonDocument doc;

  doc["aptoID"] = "apto_101";

  JsonArray arr = doc["leituras"].to<JsonArray>();

  for (int i = 0; i < bufferIndex; i++)
  {
    JsonObject item = arr.add<JsonObject>();
    item["timestamp"] = bufferTimestamps[i];
    item["valor"] = bufferKwh[i];
    item["potencia"] = bufferPotencia[i];
    item["corrente"] = bufferCorrente[i];
  }

  String json;
  serializeJson(doc, json);

  Serial.println("Enviando:");
  Serial.println(json);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", "123456");

  int httpCode = http.POST(json);

  Serial.print("HTTP: ");
  Serial.println(httpCode);

  if (httpCode == 200)
  {
    bufferIndex = 0;
  }

  http.end();
}

void setup()
{
  Serial.begin(115200);

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

  // LEITURA (1s)
  if (now - lastReadTime >= READ_INTERVAL)
  {
    lastReadTime = now;

    // SIMULAÇÃO
    potenciaWatts += random(-5, 10) * 0.1;
    if (potenciaWatts < 0)
      potenciaWatts = 0;

    energiaKwh += (potenciaWatts * 1.0) / 3600000.0;

    Serial.print("W: ");
    Serial.print(potenciaWatts);
    Serial.print(" | kWh: ");
    Serial.println(energiaKwh, 6);
  }

  // AMOSTRA (10s)
  if (now - lastSampleTime >= SAMPLE_INTERVAL)
  {
    lastSampleTime = now;

    if (bufferIndex < MAX_SAMPLES)
    {
      bufferKwh[bufferIndex] = energiaKwh;
      bufferPotencia[bufferIndex] = potenciaWatts;
      bufferCorrente[bufferIndex] = potenciaWatts / 220.0; // exemplo simples

      bufferTimestamps[bufferIndex] = getTimestampISO();

      bufferIndex++;

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