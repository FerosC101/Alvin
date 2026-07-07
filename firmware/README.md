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
   - **DHT sensor library** (Adafruit) + **Adafruit Unified Sensor**
   - **ArduinoJson** (v6)
2. Open `alvin_sensor_node/alvin_sensor_node.ino` in the Arduino IDE.
3. Edit `config.h`:
   - `WIFI_SSID` / `WIFI_PASSWORD`
   - `ALVIN_API_URL` — the **LAN IP** of the machine running the backend
     (`http://<your-ip>:8000`), **not** `localhost`.
   - `NODE_ID` — must match a node in the backend (default seed includes
     `node_r610`), and `ROOM_NAME` for the device list.
4. Select your ESP32 board + port and **Upload**.
5. Open Serial Monitor @ **115200 baud** — you should see readings and
   `POST /api/sensors/ingest -> 200`.

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
2. **Find your computer's LAN IP** (e.g. `ipconfig getifaddr en0` on macOS) and
   put `http://<that-ip>:8000` in `config.h` → `ALVIN_API_URL`.
3. **Start the frontend**:
   ```bash
   npm run dev
   ```
   Set `VITE_API_URL` in the frontend `.env` to `http://localhost:8000` (default).
4. **Power the ESP32.** Within a few seconds it registers itself and starts
   posting readings.
5. Open the web app → **Analytics** (and the **Digital Twin** room status). The
   room bound to `NODE_ID` now shows the **live DHT22 temperature/humidity**, the
   comfort score recalculates, and the **● LIVE** badge appears.

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
- The in-memory datastore **resets on backend restart**. For persistence,
  configure `FIREBASE_CREDENTIALS` (see `alvin-backend/README.md`) and the same
  endpoints persist to Firestore instead.
- `air_quality` is optional on the backend, so DHT22-only nodes don't send it.
