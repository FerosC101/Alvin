import os
import math
import requests
from typing import List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()  # read config from a local .env file if present

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import credentials, firestore
import networkx as nx

# ALVIN Dynamic Environmental Navigation — in-memory routing layer.
# This import allows the /api/navigate endpoint to delegate to the mock-based
# router for testing "auto" and "emergency" preferences without Firebase.
from router import navigate_mock

app = FastAPI(
    title="ALVIN Backend Engine",
    description="Core infrastructure, routing, and Firebase bridge for Project ALVIN",
    version="1.0.0"
)

# --- CONFIG (via environment variables; see .env.example) ---
# Comma-separated list of allowed frontend origins.
CORS_ORIGINS = os.getenv(
    "ALVIN_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:8080,http://127.0.0.1:8080",
).split(",")
CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS",
    "alvin-661c5-firebase-adminsdk-fbsvc-6838c1e821.json",
)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Allow the Vite frontend (dev server) to call this API from the browser, on
# any localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- IN-MEMORY FIRESTORE SHIM ---------------------------------------------
# A tiny in-memory store that mimics the subset of the Firestore API this app
# uses, so the whole pipeline (ESP32 -> ingest -> dashboard) works locally
# WITHOUT Firebase credentials. If real credentials are present we use
# Firestore instead and this shim is never touched.
class _MemDoc:
    def __init__(self, data, cid, did):
        self._data, self._cid, self._did = data, cid, did

    @property
    def exists(self):
        return self._did in self._data.get(self._cid, {})

    def to_dict(self):
        return dict(self._data.get(self._cid, {}).get(self._did, {}))

    def set(self, payload, merge=False):
        col = self._data.setdefault(self._cid, {})
        if merge and self._did in col:
            col[self._did].update(payload)
        else:
            col[self._did] = dict(payload)

    def update(self, payload):
        self._data.setdefault(self._cid, {}).setdefault(self._did, {}).update(payload)

    def get(self):
        return self


class _MemCollection:
    def __init__(self, data, cid):
        self._data, self._cid = data, cid

    def document(self, did):
        return _MemDoc(self._data, self._cid, did)

    def stream(self):
        col = self._data.get(self._cid, {})
        return [_MemDoc(self._data, self._cid, did) for did in list(col.keys())]


class InMemoryDB:
    def __init__(self):
        self._data = {}

    def collection(self, cid):
        return _MemCollection(self._data, cid)


def seed_memory(store):
    """Seed the in-memory DB with the Seda BGC building so the web app has
    data to show even before any sensor connects. Node ids match the firmware."""
    rooms = [
        ("node_r610", "Room 610", "Premier Suite · 6F", "610", 95, 24.3, 52, 0.6, 30, 2, 2),
        ("node_r501", "Room 501", "Deluxe Room · 5F", "501", 92, 24.1, 54, 0.5, 32, 2, 2),
        ("node_r803", "Room 803", "Corner Suite · 8F", "803", 82, 25.2, 55, 0.5, 34, 1, 3),
        ("node_r712", "Room 712", "Deluxe Room · 7F", "712", 75, 25.8, 60, 0.4, 38, 2, 2),
        ("node_r502", "Room 502", "Deluxe Room · 5F", "502", 70, 26.9, 58, 0.3, 40, 0, 2),
        ("node_pool", "Pool Deck", "Amenities · 5F", "PD", 64, 27.8, 63, 0.4, 55, 12, 40),
        ("node_restaurant", "Straight Up", "Dining · 11F", "11F", 58, 28.6, 66, 0.7, 60, 34, 90),
        ("node_function", "Function Room", "Events · 2F", "2F", 50, 29.7, 68, 0.8, 52, 40, 120),
        ("node_lobby", "Lobby", "Ground Floor", "GF", 40, 31.1, 70, 0.2, 58, 25, 80),
    ]
    for nid, name, wing, room_no, score, temp, hum, air, noise, occ, cap in rooms:
        store.collection("nodes").document(nid).set({
            "id": nid, "name": name, "floor": 1, "x": 0.0, "y": 0.0, "type": "room",
            "comfort_score": score, "wing": wing, "room_no": room_no,
            "temperature": temp, "humidity": hum, "airflow": air, "noise": noise,
            "occupancy": occ, "capacity": cap,
        })
    devices = [
        ("esp32-01", "Room 610", ["Temp", "Humidity"], 100, "online", "just now"),
        ("esp32-02", "Room 501", ["Temp", "Humidity"], 88, "online", "8s ago"),
        ("esp32-03", "Room 712", ["Temp", "Humidity"], 74, "online", "12s ago"),
    ]
    for did, room, sensors, battery, status, last_seen in devices:
        store.collection("devices").document(did).set({
            "id": did, "room": room, "sensors": sensors,
            "battery": battery, "status": status, "last_seen": last_seen,
        })


# Initialize the datastore: Firestore if credentials exist, else in-memory.
USING_FIRESTORE = os.path.exists(CREDENTIALS_PATH)
if USING_FIRESTORE:
    cred = credentials.Certificate(CREDENTIALS_PATH)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Datastore: Firestore (Firebase credentials found).")
else:
    db = InMemoryDB()
    seed_memory(db)
    print(
        "Datastore: IN-MEMORY (no Firebase credentials). Data resets on restart. "
        "Sensor readings and the web app work locally."
    )


def require_db():
    """Kept for compatibility; the datastore is always available now."""
    return db

# --- PYDANTIC SCHEMAS (Data Validation) ---

class SystemStatus(BaseModel):
    emergency_mode: str  # Options: "none", "fire", "earthquake", "flood"

class EdgeStatusUpdate(BaseModel):
    status: str          # Options: "open", "blocked_by_fire", "blocked_by_flood"

    
class Node(BaseModel):
    id: str                 # e.g., "node_rm301"
    name: str               # e.g., "Room 301 / Study Oasis"
    floor: int = 1          # e.g., 3
    x: float = 0.0          # Coordinates for the 3D/2D map mapping
    y: float = 0.0
    type: str = "room"      # "room", "hallway", "stair", "exit"
    comfort_score: float = 100.0  # Default perfect comfort
    # Enriched space metadata + latest environment readings (optional).
    wing: Optional[str] = None
    room_no: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    airflow: Optional[float] = None
    noise: Optional[float] = None
    occupancy: int = 0
    capacity: int = 0

class Device(BaseModel):
    id: str                       # e.g., "esp32-01"
    room: str                     # human-readable room name
    sensors: List[str] = []       # e.g., ["Temp", "Humidity", "Airflow"]
    battery: int = 100            # percentage
    status: str = "online"        # "online" | "degraded" | "offline"
    last_seen: str = "just now"

class EvacuationCenter(BaseModel):
    id: str                       # e.g., "evac_sm_aura"
    name: str                     # e.g., "SM Aura Premier"
    partner: str = "Partner Evacuation Center"
    address: str = ""
    lat: float
    lng: float

class Edge(BaseModel):
    id: str          # e.g., "edge_rm301_to_hallway3"
    source: str      # id of starting node
    target: str      # id of destination node
    distance: float  # distance in meters
    is_covered: bool # true if it has a roof (penalised under "covered" / rainy "auto")
    is_shaded: bool = False  # true if shaded by trees or overhang (penalised under sunny "auto")
    status: str = "open" # "open", "blocked_by_fire", "blocked_by_flood"

class SensorReading(BaseModel):
    sensor_id: str           # e.g., "esp32_001"
    node_id: str             # e.g., "node_001" - Crucial for linking data to the map!
    temperature: float       # Temperature in Celsius
    humidity: float          # Humidity percentage (0-100)
    air_quality: float = 50.0  # Air Quality Index (optional; DHT22-only nodes omit it)
    airflow: Optional[float] = None   # m/s (optional)
    noise: Optional[float] = None     # dB (optional)
    occupancy: Optional[int] = None   # people currently in the space (optional)

    # Automatically stamps the exact time the reading hits the server if the ESP32 doesn't provide one
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": "ALVIN Backend Engine",
        "firebase_connected": USING_FIRESTORE,
        "datastore": "firestore" if USING_FIRESTORE else "memory",
    }

# Endpoint to add or update a structural Node
@app.post("/api/nodes", tags=["Map Infrastructure"])
def create_or_update_node(node: Node):
    require_db()
    try:
        db.collection("nodes").document(node.id).set(node.model_dump())
        return {"status": "success", "message": f"Node {node.id} successfully saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to add or update a walkable Pathway (Edge)
@app.post("/api/edges", tags=["Map Infrastructure"])
def create_or_update_edge(edge: Edge):
    require_db()
    try:
        source_doc = db.collection("nodes").document(edge.source).get()
        target_doc = db.collection("nodes").document(edge.target).get()
        
        if not source_doc.exists or not target_doc.exists:
            raise HTTPException(status_code=400, detail="Source or Target node does not exist in the database.")

        db.collection("edges").document(edge.id).set(edge.model_dump())
        return {"status": "success", "message": f"Edge {edge.id} successfully saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NAVIGATION ENGINE HELPERS ---

def _compute_edge_weight(edge_data: dict, nodes_dict: dict, effective_preference: str) -> float:
    """
    Returns the routing weight for a single edge given a fully-resolved preference string.

    Blocked edges always return inf regardless of preference, so the pathfinder
    never considers them.  The three original modes are reproduced exactly;
    'shaded' is the only addition (used internally by 'auto' on sunny days).

    effective_preference must be one of:
        'shortest'   – weight is raw distance only
        'covered'    – uncovered edges penalised +100 m (original rain logic)
        'comfortable'– edges leading to low-comfort nodes penalised proportionally
        'shaded'     – unshaded edges penalised +50 m (sunny-day comfort routing)
    """
    # Blocked paths are impassable in every mode.
    if edge_data.get("status", "open") != "open":
        return float("inf")

    base_weight = edge_data["distance"]

    if effective_preference == "covered":
        # Original logic: strongly penalise uncovered segments so the router
        # prefers any covered alternative within a ~100 m detour budget.
        if not edge_data.get("is_covered", True):
            base_weight += 100.0

    elif effective_preference == "comfortable":
        # Original logic: penalise edges leading to uncomfortable nodes.
        # Each comfort point below 100 adds 2 m of virtual distance.
        target_node_id = edge_data["target"]
        comfort = nodes_dict.get(target_node_id, {}).get("comfort_score", 100.0)
        base_weight += (100.0 - comfort) * 2.0

    elif effective_preference == "shaded":
        # Sunny-day routing: prefer shaded walkways when distances are similar.
        # Half the covered penalty (50 m) because shade is a comfort preference,
        # not a safety rule — we won't force very long detours just for shade.
        if not edge_data.get("is_shaded", False):
            base_weight += 50.0

    # 'shortest' falls through with no additional penalty.
    return base_weight


def _resolve_auto_preference(weather: dict) -> str:
    """
    Translates live weather data into a concrete routing preference string.

    Resolution order (first match wins):
        1. Raining or drizzling  → 'covered'  (safety: avoid getting wet)
        2. Clear or sunny        → 'shaded'   (comfort: avoid direct sun exposure)
        3. Anything else         → 'shortest' (neutral: clouds, haze, unknown)

    If the weather call failed, get_sta_mesa_weather() already returns a safe
    fallback dict with is_raining=False and condition='Unknown', so this
    function will return 'shortest' and the router degrades gracefully.
    """
    if weather.get("is_raining", False):
        return "covered"
    condition = weather.get("condition", "Unknown").lower()
    if condition in ("clear", "sunny"):
        return "shaded"
    return "shortest"


def _format_route_path(path: list[str], nodes_dict: dict) -> list[dict]:
    """Format a route path while preserving geoposition data from the backend graph."""
    formatted_route = []
    for node_id in path:
        node_info = nodes_dict.get(node_id, {})
        formatted_route.append({
            "id": node_id,
            "name": node_info.get("name", node_id),
            "floor": node_info.get("floor"),
            "x": node_info.get("x"),
            "y": node_info.get("y"),
            "lat": node_info.get("lat"),
            "lng": node_info.get("lng"),
            "comfort_score": node_info.get("comfort_score", 100.0),
        })
    return formatted_route


# --- NAVIGATION ENGINE ---

@app.get("/api/navigate", tags=["Navigation Engine"])
def navigate(
    start_node: str = Query(..., description="ID of the starting node"),
    end_node: str = Query(..., description="ID of the destination node"),
    preference: str = Query(
        "shortest",
        description=(
            "Routing preference. Options: "
            "'shortest' (default) — raw distance only; "
            "'covered' — avoid uncovered paths (rainy conditions); "
            "'comfortable' — avoid low-comfort-score nodes; "
            "'auto' — selects covered/shaded/shortest based on live weather; "
            "'emergency' — shortest safe route to the nearest reachable exit node, "
            "ignoring end_node."
        ),
    ),
    weather: str = Query(
        "Cloudy",
        description=(
            "Weather override for testing the mock routing layer. "
            "Only used when preference is 'auto' or 'emergency'. "
            "Valid values: 'Clear', 'Rain', 'Cloudy'. "
            "When the live weather API is wired in, this parameter will be ignored."
        ),
    ),
):
    """
    ALVIN Dynamic Pathfinding Engine.
    Computes real-time routing paths while adjusting to structural blocks and comfort preferences.
    """
    # ------------------------------------------------------------------
    # DYNAMIC ENVIRONMENTAL NAVIGATION — mock routing layer intercept.
    #
    # When preference is "auto" or "emergency", delegate to the in-memory
    # routing module instead of querying Firebase.  This allows the new
    # weather-aware and emergency-aware routing logic to be developed and
    # tested without a live database or weather API.
    #
    # The React frontend is unaffected — the response shape is identical.
    # Existing preference values ("shortest", "covered", "comfortable")
    # continue to hit the Firestore-backed path below as before.
    # ------------------------------------------------------------------
    if preference in ("auto", "emergency"):
        try:
            emergency_flag = (preference == "emergency")
            return navigate_mock(
                start=start_node,
                end=end_node,
                weather_condition=weather,
                emergency=emergency_flag,
            )
        except nx.NodeNotFound as e:
            raise HTTPException(status_code=404, detail=f"Location error: {str(e)}")
        except nx.NetworkXNoPath:
            raise HTTPException(
                status_code=400,
                detail="Navigation Impossible: No safe pathways exist.",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal Engine Error: {str(e)}")

    # ------------------------------------------------------------------
    # ORIGINAL FIRESTORE-BACKED ROUTING (unchanged).
    #
    # Existing callers passing preference="shortest" / "covered" /
    # "comfortable" execute this path exactly as they did before.
    # ------------------------------------------------------------------
    require_db()
    try:
        # ------------------------------------------------------------------
        # 1. Load nodes and edges from Firestore (same as before).
        # ------------------------------------------------------------------
        effective_preference = preference
        nodes_ref = db.collection("nodes").stream()
        nodes_dict = {}
        for doc in nodes_ref:
            node_data = doc.to_dict()
            nodes_dict[node_data["id"]] = node_data

        edges_ref = db.collection("edges").stream()
        # Store raw edge dicts so emergency routing can reuse them.
        all_edges: list[dict] = [doc.to_dict() for doc in edges_ref]

        # ------------------------------------------------------------------
        # 2. NORMAL ROUTING (shortest / covered / comfortable)
        #    Identical to the original implementation; weight calculation is
        #    now delegated to _compute_edge_weight for clarity.
        # ------------------------------------------------------------------
        G = nx.Graph()
        for node_id, node_data in nodes_dict.items():
            G.add_node(node_id, **node_data)

        for edge_data in all_edges:
            weight = _compute_edge_weight(edge_data, nodes_dict, effective_preference)
            G.add_edge(edge_data["source"], edge_data["target"], weight=weight, **edge_data)

        path = nx.shortest_path(G, source=start_node, target=end_node, weight="weight")

        formatted_route = _format_route_path(path, nodes_dict)

        return {
            "status": "success",
            "navigation_preference": preference,
            "total_steps": len(path),
            "route_sequence": path,
            "detailed_path": formatted_route,
        }

    except nx.NodeNotFound as e:
        raise HTTPException(status_code=404, detail=f"Location error: {str(e)}")
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=400, detail="Navigation Impossible: No safe pathways exist.")
    except HTTPException:
        raise  # re-raise our own errors unchanged
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Engine Error: {str(e)}")


# --- NEW: EMERGENCY MANAGEMENT ---

@app.post("/api/emergency/global", tags=["Emergency Management"])
def update_global_emergency(status: SystemStatus):
    """
    Updates the global system status (e.g., triggering a campus-wide fire alarm).
    """
    require_db()
    try:
        db.collection("system_status").document("current_state").set(status.model_dump())
        return {
            "status": "success", 
            "message": f"🚨 Global emergency mode set to: {status.emergency_mode.upper()}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/emergency/edges/{edge_id}", tags=["Emergency Management"])
def update_path_status(edge_id: str, update: EdgeStatusUpdate):
    """
    Instantly blocks or opens a specific pathway. 
    ALVIN's navigation engine will automatically route around blocked paths on the next request.
    """
    require_db()
    try:
        edge_ref = db.collection("edges").document(edge_id)
        
        # Check if the edge exists before updating
        if not edge_ref.get().exists:
            raise HTTPException(status_code=404, detail=f"Edge '{edge_id}' not found.")
        
        # Update just the status field of the specific edge
        edge_ref.update({"status": update.status})
        
        return {
            "status": "success", 
            "message": f"🚧 Pathway '{edge_id}' status dynamically updated to: {update.status}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# --- NEW: SENSOR DATA & INTELLIGENCE ---
def calculate_comfort_score(temp: float, humidity: float, aqi: float) -> float:
    """
    Core Logic: Calculates an Environmental Comfort Score (0-100) 
    based on absolute deviations from ideal indoor conditions.
    """
    ideal_temp = 24.0
    ideal_humidity = 50.0
    
    # Weights: 3 pts lost per degree, 0.5 pts per % humidity, 0.2 pts per AQI over 50
    temp_penalty = abs(temp - ideal_temp) * 3.0
    humidity_penalty = abs(humidity - ideal_humidity) * 0.5
    aqi_penalty = max(0, aqi - 50) * 0.2
    
    # Calculate final score and clamp it strictly between 0 and 100
    raw_score = 100.0 - temp_penalty - humidity_penalty - aqi_penalty
    return max(0.0, min(100.0, round(raw_score, 1)))


def get_manila_weather():
    """
    Utility: fetch real-time weather for Manila from OpenWeatherMap.
    Returns temperature, heat index, humidity, wind, and rain intensity.
    """
    API_KEY = "75fb14edf2704573b25f21703b0c5cfa"
    CITY = "Manila,PH"
    url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        condition = data["weather"][0]["main"]  # "Rain", "Clouds", "Clear", ...
        is_raining = condition.lower() in ("rain", "drizzle", "thunderstorm")
        wind_ms = data.get("wind", {}).get("speed", 0.0)
        rain_mm = data.get("rain", {}).get("1h", 0.0)

        return {
            "status": "success",
            "location": "Manila City",
            "temperature_c": data["main"]["temp"],
            "heat_index_c": data["main"]["feels_like"],
            "humidity": data["main"].get("humidity"),
            "wind_kph": round(wind_ms * 3.6, 1),
            "rain_mm_h": rain_mm,
            "condition": condition,
            "is_raining": is_raining,
        }
    except requests.exceptions.RequestException:
        # Fallback if the API key is missing or the network is down.
        return {
            "status": "error",
            "message": "Weather API offline or missing key. Returning fallback data.",
            "location": "Manila City",
            "temperature_c": 31.0,
            "heat_index_c": 34.0,
            "humidity": 70,
            "wind_kph": 10.0,
            "rain_mm_h": 0.0,
            "condition": "Unknown",
            "is_raining": False,
        }


@app.get("/api/weather/current", tags=["Sensor Data & Intelligence"])
def fetch_current_weather():
    """Dashboard endpoint: current outdoor conditions for Manila."""
    return get_manila_weather()


@app.post("/api/sensors/ingest", tags=["Sensor Data & Intelligence"])
def ingest_sensor_data(reading: SensorReading):
    """
    Receives live environmental data from ESP32 microcontrollers.
    Calculates the comfort score and triggers an automatic map update.
    """
    require_db()
    try:
        data = reading.model_dump()
        unique_doc_id = f"{reading.sensor_id}_{int(reading.timestamp.timestamp())}"
        
        # 1. Save the raw time-series data
        db.collection("sensor_data").document(unique_doc_id).set(data)
        
        # 2. CORE LOGIC: Calculate the new comfort score
        new_comfort_score = calculate_comfort_score(
            reading.temperature, 
            reading.humidity, 
            reading.air_quality
        )
        
        # 3. DYNAMIC MAP UPDATE: Update the physical node on the map.
        # merge=True so we never overwrite the node's coordinates/name.
        node_update = {
            "comfort_score": new_comfort_score,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
        }
        if reading.airflow is not None:
            node_update["airflow"] = reading.airflow
        if reading.noise is not None:
            node_update["noise"] = reading.noise
        if reading.occupancy is not None:
            node_update["occupancy"] = reading.occupancy
        db.collection("nodes").document(reading.node_id).set(node_update, merge=True)
        
        return {
            "status": "success",
            "message": f"🌡️ Data processed. Node {reading.node_id} comfort score updated to {new_comfort_score}/100",
            "recorded_at": reading.timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during ingestion: {str(e)}")
    
@app.get("/api/dashboard/live-sensors", tags=["Sensor Data & Intelligence"])
def get_live_sensor_readings():
    """
    Dashboard Endpoint: Retrieves the most recent environmental readings 
    for all active nodes to display live metrics on the UI.
    """
    require_db()
    try:
        # Fetch all nodes from Firestore to see their current states
        nodes_ref = db.collection("nodes").stream()
        live_metrics = []
        
        for doc in nodes_ref:
            node_data = doc.to_dict()
            live_metrics.append({
                "node_id": node_data.get("id"),
                "name": node_data.get("name"),
                "comfort_score": node_data.get("comfort_score", 100.0),
                "type": node_data.get("type")
            })
            
        return {
            "status": "success",
            "total_monitored_nodes": len(live_metrics),
            "nodes": live_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live stats: {str(e)}")


@app.get("/api/dashboard/stats", tags=["Sensor Data & Intelligence"])
def get_dashboard_summary_stats():
    """
    Dashboard Endpoint: Calculates overall infrastructure intelligence statistics 
    (e.g., system-wide average comfort level, alert statuses).
    """
    require_db()
    try:
        scores, temps, hums = [], [], []
        total_occ = total_cap = 0
        low_comfort_alerts = []

        for doc in db.collection("nodes").stream():
            node = doc.to_dict()
            if node.get("type") not in (None, "room"):
                continue  # only score inhabitable rooms
            score = node.get("comfort_score", 100.0)
            scores.append(score)
            if node.get("temperature") is not None:
                temps.append(node["temperature"])
            if node.get("humidity") is not None:
                hums.append(node["humidity"])
            total_occ += node.get("occupancy", 0) or 0
            total_cap += node.get("capacity", 0) or 0

            if score < 70.0:
                low_comfort_alerts.append({
                    "node_id": node.get("id"),
                    "name": node.get("name"),
                    "current_score": score,
                })

        # Device health
        devices = [d.to_dict() for d in db.collection("devices").stream()]
        active_devices = sum(1 for d in devices if d.get("status") == "online")

        def _avg(xs, digits=1):
            return round(sum(xs) / len(xs), digits) if xs else None

        return {
            "status": "success",
            "spaces_monitored": len(scores),
            "system_wide_average_comfort": _avg(scores),
            "avg_temperature_c": _avg(temps),
            "avg_humidity": _avg(hums, 0),
            "total_occupancy": total_occ,
            "total_capacity": total_cap,
            "active_devices": active_devices,
            "total_devices": len(devices),
            "total_alerts": len(low_comfort_alerts),
            "alert_areas": low_comfort_alerts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile dashboard metrics: {str(e)}")


# --- NEW: SPACES / ROOMS ---

def _room_payload(node: dict) -> dict:
    return {
        "id": node.get("id"),
        "name": node.get("name"),
        "wing": node.get("wing"),
        "room_no": node.get("room_no"),
        "floor": node.get("floor"),
        "comfort_score": node.get("comfort_score", 100.0),
        "temperature": node.get("temperature"),
        "humidity": node.get("humidity"),
        "airflow": node.get("airflow"),
        "noise": node.get("noise"),
        "occupancy": node.get("occupancy", 0),
        "capacity": node.get("capacity", 0),
    }


@app.get("/api/rooms", tags=["Spaces"])
def get_rooms():
    """Full detail for every inhabitable room (for the Environmental / room panels)."""
    require_db()
    try:
        rooms = [
            _room_payload(doc.to_dict())
            for doc in db.collection("nodes").stream()
            if doc.to_dict().get("type", "room") == "room"
        ]
        return {"status": "success", "total": len(rooms), "rooms": rooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rooms: {str(e)}")


@app.get("/api/rooms/{node_id}", tags=["Spaces"])
def get_room(node_id: str):
    """Full detail for a single room."""
    require_db()
    try:
        doc = db.collection("nodes").document(node_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Room '{node_id}' not found.")
        return {"status": "success", "room": _room_payload(doc.to_dict())}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room: {str(e)}")


@app.get("/api/recommendations", tags=["Spaces"])
def get_recommendations():
    """
    Rank rooms by comfort and map each activity to the best-suited space.
    Powers the "Recommended for you" / recommendations views.
    """
    require_db()
    try:
        rooms = [
            _room_payload(doc.to_dict())
            for doc in db.collection("nodes").stream()
            if doc.to_dict().get("type", "room") == "room"
        ]
        ranked = sorted(rooms, key=lambda r: r["comfort_score"], reverse=True)
        activities = [
            ("Best Place to Study", "Quiet, comfortable focus space"),
            ("Best Waiting Area", "Comfortable place to wait"),
            ("Best Rest Area", "Relax and recharge"),
            ("Best Meeting Spot", "Good for group work"),
        ]
        recommendations = []
        for i, (activity, reason) in enumerate(activities):
            if i < len(ranked):
                room = ranked[i]
                recommendations.append({
                    "activity": activity,
                    "reason": reason,
                    "node_id": room["id"],
                    "name": room["name"],
                    "comfort_score": room["comfort_score"],
                })
        return {
            "status": "success",
            "recommendations": recommendations,
            "ranked": ranked,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build recommendations: {str(e)}")


# --- NEW: DEVICES (IoT sensor nodes) ---

@app.post("/api/devices", tags=["Devices"])
def create_or_update_device(device: Device):
    """Register or update an ESP32 sensor node."""
    require_db()
    try:
        db.collection("devices").document(device.id).set(device.model_dump())
        return {"status": "success", "message": f"Device {device.id} saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/devices", tags=["Devices"])
def list_devices():
    """List all IoT devices with a health summary."""
    require_db()
    try:
        devices = [d.to_dict() for d in db.collection("devices").stream()]
        active = sum(1 for d in devices if d.get("status") == "online")
        return {
            "status": "success",
            "total": len(devices),
            "active": active,
            "devices": devices,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch devices: {str(e)}")


# --- NEW: EMERGENCY STATUS + EVACUATION CENTERS ---

@app.get("/api/emergency/status", tags=["Emergency Management"])
def get_emergency_status():
    """Current global emergency state and default safe-route guidance."""
    require_db()
    try:
        doc = db.collection("system_status").document("current_state").get()
        state = doc.to_dict() if doc.exists else {}
        mode = state.get("emergency_mode", "none")
        return {
            "status": "success",
            "active": mode != "none",
            "emergency_mode": mode,
            "safe_route": state.get("safe_route", "Hallway A"),
            "nearest_exit": state.get("nearest_exit", "Front Lobby"),
            "assembly_area": state.get("assembly_area", "Covered court"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emergency status: {str(e)}")


@app.post("/api/evacuation-centers", tags=["Emergency Management"])
def create_or_update_evac_center(center: EvacuationCenter):
    """Register or update a partner evacuation center."""
    require_db()
    try:
        db.collection("evacuation_centers").document(center.id).set(center.model_dump())
        return {"status": "success", "message": f"Evacuation center {center.id} saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/evacuation-centers", tags=["Emergency Management"])
def list_evac_centers():
    """List all partner evacuation centers."""
    require_db()
    try:
        centers = [c.to_dict() for c in db.collection("evacuation_centers").stream()]
        return {"status": "success", "total": len(centers), "centers": centers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch evacuation centers: {str(e)}")


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


@app.get("/api/evacuation-centers/nearest", tags=["Emergency Management"])
def nearest_evac_center(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
):
    """Return the closest partner evacuation center to the given location."""
    require_db()
    try:
        centers = [c.to_dict() for c in db.collection("evacuation_centers").stream()]
        if not centers:
            raise HTTPException(status_code=404, detail="No evacuation centers configured.")
        for c in centers:
            c["distance_m"] = round(_haversine_m(lat, lng, c["lat"], c["lng"]), 1)
        nearest = min(centers, key=lambda c: c["distance_m"])
        return {"status": "success", "nearest": nearest, "centers": centers}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find nearest center: {str(e)}")