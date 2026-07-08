# ALVIN Sensor Node — ESP32 + DHT22

Firmware for an ALVIN IoT node. It measures temperature & humidity (DHT22) and
pushes readings to the ALVIN backend, which recomputes each room's comfort
score and updates the web app in real time.

```
[DHT22] --temp/humidity--> [ESP32] --WiFi/HTTP--> [ALVIN backend] --> [Web app]
                                    POST /api/sensors/ingest
```

## Bill of materials

- ESP32 dev board (e.g. ESP32-WROOM DevKit)
- DHT22 (AM2302) temperature/humidity sensor
- 10 kΩ resistor (DHT22 data pull-up)
- Jumper wires, breadboard

## Wiring (DHT22)

| DHT22 | ESP32 |
| ----- | ----- |
| VCC (pin 1) | 3V3 |
| DATA (pin 2) | GPIO4 (+ 10 kΩ pull-up between DATA and 3V3) |
| GND (pin 4) | GND |

> Many DHT22 breakout boards already include the pull-up resistor — then you can
> wire DATA straight to GPIO4.

## Firmware setup

1. Install the Arduino **ESP32 board package**, and these libraries (Library Manager):
   - **WiFiManager** by tzapu  (the setup portal)
   - **DHT sensor library** (Adafruit) + **Adafruit Unified Sensor**
   - **ArduinoJson** (v6)
   - (`Preferences.h` ships with the ESP32 core — no install needed.)
2. Open `alvin_sensor_node/alvin_sensor_node.ino` in the Arduino IDE. It's a
   **single self-contained file** — all settings are in the `USER CONFIG` block
   at the top.
3. WiFi and the backend URL are entered in the setup portal (not in code). You
   normally only need to check the node identity in `USER CONFIG`: `NODE_ID`
   must match the backend `HARDWARE_NODE_ID` (default `node_r610`).
4. Select your ESP32 board + port and **Upload**.

## First-time WiFi setup (captive portal)

1. On first boot (or when no WiFi is saved) the ESP32 creates its own WiFi:
   - SSID **`ALVIN-Setup`**, password **`alvinsetup`**.
2. Connect your phone/laptop to that WiFi — a **captive portal** pops up
   (or browse to `http://192.168.4.1`).
3. Tap **Configure WiFi**, pick your home network, enter its password, and set
   **ALVIN backend URL** to `http://<backend-lan-ip>:8000`. Save.
4. The ESP32 stores this in flash and joins your network. On every later boot it
   reconnects automatically — no re-entry needed.
5. Open Serial Monitor @ **115200 baud** — you should see it connect and
   `POST /api/sensors/ingest -> 200`.

> **Re-provision / change WiFi:** hold the **BOOT** button while powering on to
> clear the saved WiFi and re-open the portal.

## End-to-end: see real data in the web app

You do **not** need Firebase for this. If no Firebase credentials are present the
backend runs an **in-memory datastore** seeded with the Seda BGC rooms, so the
whole pipeline works locally.

1. **Start the backend** (binds all interfaces so the ESP32 can reach it):
   ```bash
   cd alvin-backend
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   The log should say `Datastore: IN-MEMORY ...`.
2. **Find your computer's LAN IP** (e.g. `ipconfig getifaddr en0` on macOS) —
   you'll enter `http://<that-ip>:8000` in the ESP32 setup portal.
3. **Start the frontend**:
   ```bash
   npm run dev
   ```
   `VITE_API_URL` defaults to `http://localhost:8000`.
4. **Power the ESP32** and complete the setup portal (see above): join your WiFi
   and enter the backend URL. It then registers itself and starts posting.
5. Open the web app → **Analytics** (and the **Digital Twin** room status). The
   room shows the **live DHT22 temperature/humidity**, the comfort score
   recalculates, and the **● LIVE** badge appears — the page auto-refreshes
   every few seconds, no reload needed.

### Quick test without hardware
Post a reading by hand to confirm the pipeline:
```bash
curl -X POST http://localhost:8000/api/sensors/ingest \
  -H 'Content-Type: application/json' \
  -d '{"sensor_id":"esp32-01","node_id":"node_r610","temperature":26.4,"humidity":61}'
```
Refresh the web app — Room 610's readings and comfort score update.

## Notes

- The `ESP32` and the computer running the backend must be on the **same WiFi
  network**.
- **Phone hotspot works.** In the portal, enter your hotspot's SSID/password,
  connect the backend computer to the same hotspot, and use that computer's
  hotspot IP as the backend URL. (A few phones isolate hotspot clients or let
  the hotspot sleep — if the node can't reach the backend, that's usually why.)
- The in-memory datastore **resets on backend restart**. For persistence,
  configure `FIREBASE_CREDENTIALS` (see `alvin-backend/README.md`) and the same
  endpoints persist to Firestore instead.
- `air_quality` is optional on the backend, so DHT22-only nodes don't send it.
