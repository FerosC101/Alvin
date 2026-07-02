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

> Without credentials the server still boots (degraded mode): weather works,
> but Firestore-backed endpoints return **503** until configured.

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
| POST | `/api/emergency/global` | Set global emergency mode |
| PUT | `/api/emergency/edges/{edge_id}` | Block/open a specific pathway |
| POST | `/api/sensors/ingest` | Ingest an ESP32 sensor reading |
| GET | `/api/weather/current` | Current outdoor conditions (Manila) |
| GET | `/api/dashboard/live-sensors` | Per-node comfort scores |
| GET | `/api/dashboard/stats` | System-wide average comfort + alerts |

The frontend reads its base URL from `VITE_API_URL` (default
`http://localhost:8000`).
