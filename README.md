# ALVIN — Adaptive Living Virtual Intelligence Network

A human-centered 3D Digital Twin for smart environmental navigation, comfort,
and safety. ALVIN combines IoT sensing, GIS mapping, weather intelligence, and
smart recommendations to answer one question: **"Where should I stay right now?"**

This repo has two parts:

- **Frontend** (`/`) — React + Vite dashboard (this package).
- **Backend** (`alvin-backend/`) — FastAPI engine (routing, sensors, Firebase). See its [README](alvin-backend/README.md).

## Frontend setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on localhost:8000
npm run dev
```

The UI works offline: if the backend is unreachable, live data falls back to
mock data (`src/data/mockData.js`).

## Structure

```
src/
  components/   Sidebar, TopBar, MapView, BottomPanel, BuildingViewer, Layout
  pages/        MapOverview, ThreeDTwin, Environmental, Recommendations, Emergency, Devices
  services/     api.js — backend client (fails soft to mock)
  config/       models.js — 3D model registry
  data/         mockData.js — fallback/demo data
public/models/  3D assets (main-building.glb, Room.glb, rooms/*.glb)
```

## 3D models

Drop `.glb` files in `public/models/`. The building is `main-building.glb`;
`Room.glb` is the generic room model. Register per-room models in
`src/config/models.js` under `ROOM_MODELS` (keyed by room id).

## Live data

`src/services/api.js` talks to the backend endpoints (weather, live sensors,
stats, navigation). Set `VITE_API_URL` to point at a non-default backend.
