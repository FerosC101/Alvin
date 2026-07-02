import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()  # read config from a local .env file if present

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import credentials, firestore
import networkx as nx

app = FastAPI(
    title="ALVIN Backend Engine",
    description="Core infrastructure, routing, and Firebase bridge for Project ALVIN",
    version="1.0.0"
)

# --- CONFIG (via environment variables; see .env.example) ---
# Comma-separated list of allowed frontend origins.
CORS_ORIGINS = os.getenv(
    "ALVIN_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174",
).split(",")
CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS",
    "alvin-661c5-firebase-adminsdk-fbsvc-6838c1e821.json",
)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Allow the Vite frontend (dev server) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase. If credentials are missing we start in a degraded mode
# so the API can still boot for local frontend work — Firestore-backed
# endpoints then return a clear 503 instead of crashing the whole server.
db = None
if os.path.exists(CREDENTIALS_PATH):
    cred = credentials.Certificate(CREDENTIALS_PATH)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print(
        f"WARNING: Firebase credentials '{CREDENTIALS_PATH}' not found. "
        "Firestore endpoints will return 503 until configured."
    )


def require_db():
    """Guard for Firestore-backed endpoints when running without credentials."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Firestore unavailable: Firebase credentials not configured.",
        )
    return db

# --- PYDANTIC SCHEMAS (Data Validation) ---

class SystemStatus(BaseModel):
    emergency_mode: str  # Options: "none", "fire", "earthquake", "flood"

class EdgeStatusUpdate(BaseModel):
    status: str          # Options: "open", "blocked_by_fire", "blocked_by_flood"

    
class Node(BaseModel):
    id: str          # e.g., "node_rm301"
    name: str        # e.g., "Room 301 / Study Oasis"
    floor: int       # e.g., 3
    x: float         # Coordinates for the 3D/2D map mapping
    y: float
    type: str        # "room", "hallway", "stair", "exit"
    comfort_score: float = 100.0  # Default perfect comfort

class Edge(BaseModel):
    id: str          # e.g., "edge_rm301_to_hallway3"
    source: str      # id of starting node
    target: str      # id of destination node
    distance: float  # distance in meters
    is_covered: bool # true if it has a roof
    status: str = "open" # "open", "blocked_by_fire", "blocked_by_flood"

class SensorReading(BaseModel):
    sensor_id: str           # e.g., "esp32_001"
    node_id: str             # e.g., "node_001" - Crucial for linking data to the map!
    temperature: float       # Temperature in Celsius
    humidity: float          # Humidity percentage (0-100)
    air_quality: float       # Air Quality Index (AQI)
    
    # Automatically stamps the exact time the reading hits the server if the ESP32 doesn't provide one
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "online", "project": "ALVIN Backend Engine", "firebase_connected": db is not None}

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

# --- NEW: NAVIGATION ENGINE ---

@app.get("/api/navigate", tags=["Navigation Engine"])
def navigate(
    start_node: str = Query(..., description="ID of the starting node"),
    end_node: str = Query(..., description="ID of the destination node"),
    preference: str = Query("shortest", description="Options: 'shortest', 'covered', 'comfortable'")
):
    """
    ALVIN Dynamic Pathfinding Engine.
    Computes real-time routing paths while adjusting to structural blocks and comfort preferences.
    """
    require_db()
    try:
        G = nx.Graph()
        
        # Fetch nodes
        nodes_ref = db.collection("nodes").stream()
        nodes_dict = {}
        for doc in nodes_ref:
            node_data = doc.to_dict()
            nodes_dict[node_data["id"]] = node_data
            G.add_node(node_data["id"], **node_data)
            
        # Fetch edges
        edges_ref = db.collection("edges").stream()
        for doc in edges_ref:
            edge_data = doc.to_dict()
            base_weight = edge_data["distance"]
            
            # Dynamic weights
            if edge_data.get("status", "open") != "open":
                base_weight = float('inf') 
            elif preference == "covered" and not edge_data.get("is_covered", True):
                base_weight += 100.0 
            elif preference == "comfortable":
                target_node_id = edge_data["target"]
                target_node_info = nodes_dict.get(target_node_id, {})
                comfort = target_node_info.get("comfort_score", 100.0)
                base_weight += (100.0 - comfort) * 2.0

            G.add_edge(edge_data["source"], edge_data["target"], weight=base_weight, **edge_data)
            
        # Run Shortest Path
        path = nx.shortest_path(G, source=start_node, target=end_node, weight="weight")
        
        # Format output
        formatted_route = []
        for node_id in path:
            node_info = nodes_dict.get(node_id, {})
            formatted_route.append({
                "id": node_id,
                "name": node_info.get("name", node_id),
                "floor": node_info.get("floor"),
                "x": node_info.get("x"),
                "y": node_info.get("y"),
                "comfort_score": node_info.get("comfort_score", 100.0)
            })
            
        return {
            "status": "success",
            "navigation_preference": preference,
            "total_steps": len(path),
            "route_sequence": path,
            "detailed_path": formatted_route
        }

    except nx.NodeNotFound as e:
        raise HTTPException(status_code=404, detail=f"Location error: {str(e)}")
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=400, detail="Navigation Impossible: No safe pathways exist.")
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


def get_sta_mesa_weather():

    """
    Utility Function: Fetches real-time weather data for Sta. Mesa, Manila.
    Requires a free API key from openweathermap.org.
    """
    API_KEY = OPENWEATHER_API_KEY
    CITY = "Manila,PH"
    # We ask for metric units so the temperature comes back in Celsius
    url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
    try:

        response = requests.get(url, timeout=5)

        response.raise_for_status()  # Fails safely if the API is down

        data = response.json()

        

        # Extract exactly what the ALVIN brain needs

        current_temp = data["main"]["temp"]

        heat_index = data["main"]["feels_like"] # The "real feel"

        weather_condition = data["weather"][0]["main"] # e.g., "Rain", "Clouds", "Clear"

        

        is_raining = weather_condition.lower() == "rain" or weather_condition.lower() == "drizzle"

        

        return {

            "status": "success",

            "location": "Sta. Mesa, Manila",

            "temperature_c": current_temp,

            "heat_index_c": heat_index,

            "condition": weather_condition,

            "is_raining": is_raining

        }

        

    except requests.exceptions.RequestException as e:

        # Fallback data if the API key is missing or the internet is down

        return {

            "status": "error",

            "message": "Weather API offline or missing key. Returning fallback data.",

            "location": "Sta. Mesa, Manila",

            "temperature_c": 31.0,

            "heat_index_c": 34.0,

            "condition": "Unknown",

            "is_raining": False

        }


@app.get("/api/weather/current", tags=["Sensor Data & Intelligence"])

def fetch_current_weather():

    """

    Dashboard Endpoint: Returns current outdoor conditions in Sta. Mesa.

    Used by the frontend to display weather warnings.

    """

    return get_sta_mesa_weather()


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
        
        # 3. DYNAMIC MAP UPDATE: Update the physical node on the map
        # We use merge=True so we don't accidentally overwrite the node's coordinates/name!
        db.collection("nodes").document(reading.node_id).set(
            {"comfort_score": new_comfort_score}, 
            merge=True
        )
        
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
        nodes_ref = db.collection("nodes").stream()
        
        scores = []
        low_comfort_alerts = []
        
        for doc in nodes_ref:
            node_data = doc.to_dict()
            score = node_data.get("comfort_score", 100.0)
            scores.append(score)
            
            # If a room's comfort score falls below 70, flag it as an alert area
            if score < 70.0:
                low_comfort_alerts.append({
                    "node_id": node_data.get("id"),
                    "name": node_data.get("name"),
                    "current_score": score
                })
        
        # Calculate system-wide average indoor comfort
        avg_comfort = round(sum(scores) / len(scores), 1) if scores else 100.0
        
        return {
            "status": "success",
            "system_wide_average_comfort": avg_comfort,
            "total_alerts": len(low_comfort_alerts),
            "alert_areas": low_comfort_alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile dashboard metrics: {str(e)}")