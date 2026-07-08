// -----------------------------------------------------------------------------
// ALVIN Sensor Node — ESP32 + DHT22  (single-file sketch, WiFi setup portal)
//
// First boot: the ESP32 creates its own WiFi ("ALVIN-Setup"). Connect a phone
// to it, a captive portal opens, and you enter your WiFi (home or phone
// hotspot) + the ALVIN backend URL. These are saved to flash and the node joins
// your network. On later boots it reconnects automatically — nothing hardcoded.
//
// Reads temperature & humidity (DHT22), POSTs to `/api/sensors/ingest` (which
// recomputes the room's comfort score), and registers itself via `/api/devices`.
//
// Libraries (Arduino IDE → Library Manager):
//   - "WiFiManager" by tzapu               (the setup portal)
//   - "DHT sensor library" by Adafruit     (+ "Adafruit Unified Sensor")
//   - "ArduinoJson" by Benoit Blanchon (v6)
//   (Preferences.h ships with the ESP32 board package — no install needed.)
// Board: any ESP32 dev board (e.g. "ESP32 Dev Module").
// -----------------------------------------------------------------------------
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiManager.h>      // tzapu/WiFiManager
#include <Preferences.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ======================= USER CONFIG =========================================
// Setup portal (the WiFi the ESP32 creates for first-time setup)
#define AP_SSID          "ALVIN-Setup"
#define AP_PASSWORD      "alvinsetup"      // must be >= 8 chars
#define PORTAL_TIMEOUT_S 180               // seconds the portal stays open

// Default backend URL shown in the portal (you can change it there). Use the
// LAN/hotspot IP of the machine running the backend, e.g. "http://192.168.1.10:8000".
#define ALVIN_API_URL_DEFAULT "http://192.168.1.10:8000"

// Identity of this node. NODE_ID is the connection key — it must match the
// backend/app (HARDWARE_NODE_ID). ROOM_NAME shows in the web app's device list.
#define SENSOR_ID        "esp32-01"
#define NODE_ID          "node_r610"
#define ROOM_NAME        "Room 610"

// Timing + pins
#define SEND_INTERVAL_MS 15000             // how often to push a reading (ms)
#define DHT_PIN          4                 // DHT22 data pin (10k pull-up to 3V3)
#define DHT_TYPE         DHT22
#define RESET_PIN        0                 // hold BOOT at power-on to re-provision
// =============================================================================

DHT dht(DHT_PIN, DHT_TYPE);
Preferences prefs;
String apiBase = ALVIN_API_URL_DEFAULT;
unsigned long lastSend = 0;

// ---------------------------------------------------------------------------
// WiFi provisioning (captive portal)
// ---------------------------------------------------------------------------
void setupWiFi() {
  prefs.begin("alvin", false);

  // Hold the BOOT button at power-on to wipe saved WiFi and re-open the portal.
  pinMode(RESET_PIN, INPUT_PULLUP);
  bool forcePortal = (digitalRead(RESET_PIN) == LOW);

  apiBase = prefs.getString("api", ALVIN_API_URL_DEFAULT);

  WiFiManager wm;
  WiFiManagerParameter apiParam("api", "ALVIN backend URL", apiBase.c_str(), 80);
  wm.addParameter(&apiParam);
  wm.setConfigPortalTimeout(PORTAL_TIMEOUT_S);

  if (forcePortal) {
    Serial.println("[wifi] reset requested — clearing saved WiFi");
    wm.resetSettings();
  }

  Serial.printf("[wifi] connecting (portal SSID: %s)...\n", AP_SSID);
  // autoConnect() joins the saved network, or starts the portal if none/failed.
  bool ok = wm.autoConnect(AP_SSID, AP_PASSWORD);

  // Persist the backend URL entered in the portal.
  apiBase = apiParam.getValue();
  prefs.putString("api", apiBase);

  if (ok) {
    Serial.print("[wifi] connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[wifi] not connected (portal timed out) — will retry");
  }
  Serial.printf("[cfg] backend: %s\n", apiBase.c_str());
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("[wifi] reconnecting...");
  WiFi.reconnect();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) delay(300);
}

// ---------------------------------------------------------------------------
// Backend communication
// ---------------------------------------------------------------------------
bool httpPostJson(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(apiBase + path);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("[http] POST %s -> %d\n", path.c_str(), code);
  if (code > 0) Serial.println(http.getString());
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
  setupWiFi();
  registerDevice();
}

void loop() {
  ensureWiFi();

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
