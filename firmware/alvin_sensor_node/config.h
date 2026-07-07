#pragma once
// -----------------------------------------------------------------------------
// ALVIN sensor node configuration.
// Copy this file, fill in your values, and keep secrets out of version control.
// -----------------------------------------------------------------------------

// ---- WiFi ----
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ---- ALVIN backend (FastAPI) ----
// Use the LAN IP of the machine running `uvicorn main:app --port 8000`,
// e.g. "http://192.168.1.10:8000". Do NOT use "localhost" — that resolves to
// the ESP32 itself.
#define ALVIN_API_URL   "http://192.168.1.10:8000"

// Identity of this node. NODE_ID must match a node already in Firestore
// (see alvin-backend/seed.py). ROOM_NAME is shown in the web app's device list.
#define SENSOR_ID       "esp32-01"
#define NODE_ID         "node_r610"
#define ROOM_NAME       "Room 610"

// ---- Timing ----
#define SEND_INTERVAL_MS   15000   // how often to push a reading (ms)

// ---- Pins ----
#define DHT_PIN         4          // DHT22 data pin (with 10k pull-up to 3V3)
#define DHT_TYPE        DHT22
