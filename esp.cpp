#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ========================
// WIFI
// ========================
const char *ssid = "";
const char *password = "";

// ========================
// FIREBASE
// ========================
const char *firebaseUrl =
    "https://controle-energia-d3121-default-rtdb.firebaseio.com/Esp32/apto101.json";

// ========================
// INTERVALOS
// ========================
#define READ_INTERVAL 1000    // 1s
#define SAMPLE_INTERVAL 10000 // 10s
#define SEND_INTERVAL 60000   // 60s

unsigned long lastReadTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastSendTime = 0;

// ========================
// BUFFER
// ========================
#define MAX_SAMPLES 6

float bufferKwh[MAX_SAMPLES];
String bufferTimestamps[MAX_SAMPLES];
int bufferIndex = 0;

// ========================
// Variáveis de energia
// ========================
float potenciaWatts = 100.0; // potência instantânea
float energiaKwh = 0.0;      // energia acumulada

// ========================
// Timestamp
// ========================
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

// ========================
// Envio em lote
// ========================
void enviarBufferFirebase()
{
  if (WiFi.status() != WL_CONNECTED || bufferIndex == 0)
    return;

  DynamicJsonDocument doc(2048);
  JsonArray arr = doc.to<JsonArray>();

  for (int i = 0; i < bufferIndex; i++)
  {
    JsonObject item = arr.createNestedObject();
    item["timestamp"] = bufferTimestamps[i];
    item["valor"] = bufferKwh[i];
    // item["reais"] = bufferKwh[i] * 0.95; // tarifa
  }

  String json;
  serializeJson(doc, json);

  Serial.println("Enviando lote:");
  Serial.println(json);

  HTTPClient http;
  http.begin(firebaseUrl);
  http.addHeader("Content-Type", "application/json");
  http.POST(json);
  http.end();

  bufferIndex = 0;
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

  // ===========================
  // Leitura + integração (1s)
  // ===========================
  if (now - lastReadTime >= READ_INTERVAL)
  {
    lastReadTime = now;

    // SIMULAÇÃO
    potenciaWatts += random(-5, 10) * 0.1;
    if (potenciaWatts < 0)
      potenciaWatts = 0;

    // INTEGRAÇÃO DE ENERGIA
    energiaKwh += (potenciaWatts * 1.0) / 3600000.0;

    Serial.print("W: ");
    Serial.print(potenciaWatts);
    Serial.print(" | kWh: ");
    Serial.println(energiaKwh, 6);
  }

  // ===========================
  // Salvar a cada 10s
  // ===========================
  if (now - lastSampleTime >= SAMPLE_INTERVAL)
  {
    lastSampleTime = now;

    if (bufferIndex < MAX_SAMPLES)
    {
      bufferKwh[bufferIndex] = energiaKwh;
      bufferTimestamps[bufferIndex] = getTimestampISO();
      bufferIndex++;

      Serial.print("Amostra kWh salva: ");
      Serial.println(energiaKwh, 6);
    }
  }

  // ===========================
  // Enviar a cada 60s
  // ===========================
  if (now - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = now;
    enviarBufferFirebase();
  }
}