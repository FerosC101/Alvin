import os
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore
import networkx as nx  # <-- Added NetworkX

app = FastAPI(
    title="ALVIN Backend Engine",
    description="Core infrastructure, routing, and Firebase bridge for Project ALVIN",
    version="1.0.0"
)

# Initialize Firebase
CREDENTIALS_PATH = "alvin-661c5-firebase-adminsdk-fbsvc-a5d7a7f43c.json"
if not os.path.exists(CREDENTIALS_PATH):
    raise FileNotFoundError(f"Critical Error: '{CREDENTIALS_PATH}' not found.")

cred = credentials.Certificate(CREDENTIALS_PATH)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

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

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "online", "project": "ALVIN Backend Engine", "firebase_connected": True}

# Endpoint to add or update a structural Node
@app.post("/api/nodes", tags=["Map Infrastructure"])
def create_or_update_node(node: Node):
    try:
        db.collection("nodes").document(node.id).set(node.model_dump())
        return {"status": "success", "message": f"Node {node.id} successfully saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to add or update a walkable Pathway (Edge)
@app.post("/api/edges", tags=["Map Infrastructure"])
def create_or_update_edge(edge: Edge):
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