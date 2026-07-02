"""
Seed the ALVIN graph with a sample building (nodes + edges) so the live
endpoints (/api/navigate, /api/dashboard/*) return real data.

Requires the backend running WITH Firebase credentials configured:

    uvicorn main:app --reload --port 8000   # in one terminal
    python seed.py                          # in another

Node names mirror the frontend rooms so the comfort overlay matches by name.
Set ALVIN_API_URL to target a non-default backend.
"""
import os
import sys
import requests

API = os.getenv("ALVIN_API_URL", "http://localhost:8000")

# id, name, type, x, y, comfort_score
NODES = [
    ("node_entrance", "Entrance Lobby", "room", 0, 0, 50),
    ("node_hallway", "Hallway", "hallway", 0, 10, 58),
    ("node_library", "Library", "room", -10, 20, 95),
    ("node_study1", "Study Area 1", "room", -20, 20, 92),
    ("node_admin", "Admin Office", "room", 10, 20, 70),
    ("node_lecture1", "Lecture Room 1", "room", 20, 25, 75),
    ("node_lounge", "Lounge", "room", 15, 30, 82),
    ("node_cafeteria", "Cafeteria", "room", -5, 30, 64),
    ("node_storage", "Storage", "room", -20, 5, 40),
    ("node_exit", "Main Exit", "exit", 0, -10, 100),
    ("node_assembly", "Assembly Court", "exit", 0, -25, 100),
]

# id, source, target, distance (m), is_covered
EDGES = [
    ("e_entrance_hallway", "node_entrance", "node_hallway", 10, True),
    ("e_hallway_library", "node_hallway", "node_library", 14, True),
    ("e_hallway_study1", "node_hallway", "node_study1", 22, True),
    ("e_hallway_admin", "node_hallway", "node_admin", 14, True),
    ("e_hallway_lecture1", "node_hallway", "node_lecture1", 24, True),
    ("e_hallway_lounge", "node_hallway", "node_lounge", 25, True),
    ("e_hallway_cafeteria", "node_hallway", "node_cafeteria", 21, True),
    ("e_entrance_storage", "node_entrance", "node_storage", 20, False),
    ("e_entrance_exit", "node_entrance", "node_exit", 10, False),
    ("e_exit_assembly", "node_exit", "node_assembly", 15, False),
]


def post(path, payload):
    r = requests.post(f"{API}{path}", json=payload, timeout=10)
    r.raise_for_status()
    return r.json()


def main():
    try:
        health = requests.get(f"{API}/", timeout=5).json()
    except requests.exceptions.RequestException:
        sys.exit(f"Backend not reachable at {API}. Start it first.")
    if not health.get("firebase_connected"):
        sys.exit("Backend is up but Firebase is not connected — configure FIREBASE_CREDENTIALS.")

    for node_id, name, ntype, x, y, comfort in NODES:
        post("/api/nodes", {
            "id": node_id, "name": name, "floor": 1,
            "x": x, "y": y, "type": ntype, "comfort_score": comfort,
        })
        print(f"  node  {node_id:16} {name} ({comfort}%)")

    for edge_id, src, tgt, dist, covered in EDGES:
        post("/api/edges", {
            "id": edge_id, "source": src, "target": tgt,
            "distance": dist, "is_covered": covered, "status": "open",
        })
        print(f"  edge  {edge_id}")

    print(f"\nSeeded {len(NODES)} nodes and {len(EDGES)} edges.")


if __name__ == "__main__":
    main()
