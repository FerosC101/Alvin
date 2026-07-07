# ALVIN Backend Engine

FastAPI service: infrastructure graph, dynamic routing, emergency management,
sensor ingestion, and a Firebase (Firestore) bridge for Project ALVIN.

## Setup

```bash
cd alvin-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in the values
```

Provide the Firebase Admin SDK service-account JSON and point
`FIREBASE_CREDENTIALS` at it. Add an `OPENWEATHER_API_KEY` for live weather.

> **No Firebase? It still works.** Without credentials the server runs an
> **in-memory datastore** seeded with the Seda BGC rooms — sensor ingestion, the
> dashboard endpoints, and the web app all function locally (data resets on
> restart). Configure `FIREBASE_CREDENTIALS` to persist to Firestore instead.

## Run

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Seed sample data

With the server running (and Firebase connected), populate a sample building
graph so the navigation and dashboard endpoints return real data:

```bash
python seed.py
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Health + Firebase connection status |
| POST | `/api/nodes` | Create/update a map node (room, hallway, exit) |
| POST | `/api/edges` | Create/update a walkable path between nodes |
| GET | `/api/navigate` | Shortest / covered / comfortable route |
| GET | `/api/rooms` | Full detail for all rooms |
| GET | `/api/rooms/{node_id}` | Full detail for one room |
| GET | `/api/recommendations` | Best space per activity + ranked list |
| POST | `/api/devices` | Register/update an IoT device |
| GET | `/api/devices` | List devices + health summary |
| POST | `/api/emergency/global` | Set global emergency mode |
| GET | `/api/emergency/status` | Current emergency state + safe-route guidance |
| PUT | `/api/emergency/edges/{edge_id}` | Block/open a specific pathway |
| POST | `/api/evacuation-centers` | Register/update a partner evacuation center |
| GET | `/api/evacuation-centers` | List partner evacuation centers |
| GET | `/api/evacuation-centers/nearest` | Nearest center to `?lat=&lng=` |
| POST | `/api/sensors/ingest` | Ingest an ESP32 sensor reading |
| GET | `/api/weather/current` | Current outdoor conditions (Manila) |
| GET | `/api/dashboard/live-sensors` | Per-node comfort scores |
| GET | `/api/dashboard/stats` | Building-wide comfort, occupancy, devices, alerts |

The frontend reads its base URL from `VITE_API_URL` (default
`http://localhost:8000`).
