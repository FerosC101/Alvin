// -----------------------------------------------------------------------------
// ALVIN Sensor Node — ESP32 + DHT22
//
// Reads temperature & humidity (DHT22) and POSTs a reading to the ALVIN backend
// `/api/sensors/ingest`, which recomputes the room's comfort score. On boot it
// also registers itself via `/api/devices` so it shows up in the web app.
//
// Libraries (install via Arduino Library Manager):
//   - "DHT sensor library" by Adafruit  (+ "Adafruit Unified Sensor")
//   - "ArduinoJson" by Benoit Blanchon (v6)
// Board: any ESP32 dev board (e.g. "ESP32 Dev Module").
// -----------------------------------------------------------------------------
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "config.h"

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
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(ALVIN_API_URL) + path);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("[http] POST %s -> %d\n", path.c_str(), code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  return code >= 200 && code < 300;
}

// Register this node in the web app's device list.
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

// Push a sensor reading; the backend recomputes the node's comfort score.
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
