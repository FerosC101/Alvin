// -----------------------------------------------------------------------------
// ALVIN Sensor Node — ESP32 + DHT22  (single-file sketch, hardcoded WiFi)
//
// Set your WiFi (or phone hotspot) + the ALVIN backend URL in USER CONFIG below,
// then upload. The ESP32 joins that network, reads temperature & humidity
// (DHT22), POSTs to `/api/sensors/ingest` (which recomputes the room's comfort
// score), and registers itself via `/api/devices` so it appears in the web app.
//
// Libraries (Arduino IDE → Library Manager):
//   - "DHT sensor library" by Adafruit     (+ "Adafruit Unified Sensor")
//   - "ArduinoJson" by Benoit Blanchon (v6)
//   (WiFi.h / HTTPClient.h ship with the ESP32 board package — no install.)
// Board: any ESP32 dev board (e.g. "ESP32 Dev Module").
// -----------------------------------------------------------------------------
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ======================= USER CONFIG =========================================
// WiFi to join — your home WiFi or your phone's hotspot.
#define WIFI_SSID       "HONOR X9c"
#define WIFI_PASSWORD   "12345678"

// Backend URL — the LAN/hotspot IP of the computer running the backend.
// e.g. on a phone hotspot it's often http://172.20.10.x:8000
#define ALVIN_API_URL   "http://10.34.88.133:8000"

// Identity of this node. NODE_ID is the connection key — it must match the
// backend/app (HARDWARE_NODE_ID). ROOM_NAME shows in the web app's device list.
#define SENSOR_ID       "esp32-01"
#define NODE_ID         "node_r610"
#define ROOM_NAME       "Room 610"

// Timing + pins
#define SEND_INTERVAL_MS 15000             // how often to push a reading (ms)
#define DHT_PIN          4                 // DHT22 data pin (10k pull-up to 3V3)
#define DHT_TYPE         DHT22
// =============================================================================

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSend = 0;

// ---------------------------------------------------------------------------
// WiFi
// ---------------------------------------------------------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[wifi] connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[wifi] FAILED — will retry");
  }
}

// ---------------------------------------------------------------------------
// Backend communication
// ---------------------------------------------------------------------------
bool httpPostJson(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[http] skipped — WiFi not connected");
    return false;
  }
  String url = String(ALVIN_API_URL) + path;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("[http] POST %s -> %d\n", url.c_str(), code);
    Serial.println(http.getString());
  } else {
    // Negative codes mean the connection itself failed (couldn't reach backend).
    Serial.printf("[http] POST %s FAILED (%d): %s\n", url.c_str(), code,
                  http.errorToString(code).c_str());
  }
  http.end();
  return code >= 200 && code < 300;
}

void registerDevice() {
  StaticJsonDocument<256> doc;
  doc["id"] = SENSOR_ID;
  doc["room"] = ROOM_NAME;
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("Temp");
  sensors.add("Humidity");
  doc["battery"] = 100;
  doc["status"] = "online";
  doc["last_seen"] = "just now";
  String body;
  serializeJson(doc, body);
  httpPostJson("/api/devices", body);
}

void sendReading(float temp, float hum) {
  StaticJsonDocument<192> doc;
  doc["sensor_id"] = SENSOR_ID;
  doc["node_id"] = NODE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  String body;
  serializeJson(doc, body);
  httpPostJson("/api/sensors/ingest", body);
}

// ---------------------------------------------------------------------------
// Arduino lifecycle
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  dht.begin();
  connectWiFi();
  registerDevice();
}

void loop() {
  connectWiFi();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    float temp = dht.readTemperature();    // Celsius
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) {
      Serial.println("[dht] read failed, skipping");
      return;
    }

    Serial.printf("[read] T=%.1f°C  H=%.0f%%\n", temp, hum);
    sendReading(temp, hum);
  }

  delay(100);
}
