"""
router.py — ALVIN Dynamic Environmental Navigation (routing decision layer)

This module is intentionally decoupled from Firebase and from the live weather
API.  It operates entirely on in-memory data so the routing logic can be
developed, tested, and demonstrated without any external dependencies.

Public surface
--------------
navigate_mock(start, end, weather_condition, emergency)
    The single entry-point used by main.py.  Returns a dict whose shape is
    identical to the existing /api/navigate response so the React frontend
    needs zero changes.

Integration path
----------------
When Firebase is ready, replace MOCK_GRAPH with a function that streams
nodes/edges from Firestore and wraps them in the same MockGraph dataclass.
When the live weather API is ready, replace the weather_condition string with
the output of _resolve_auto_preference() from main.py.

Nothing in this file imports FastAPI, Firebase, or requests.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import networkx as nx


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

# The only weather values the routing layer needs to know about.
# "Cloudy" (and anything unrecognised) maps to the neutral shortest path.
WeatherCondition = Literal["Clear", "Rain", "Cloudy"]

# The four concrete preference strings the weight function understands.
# "emergency" is resolved here; it never reaches compute_edge_weight.
_Preference = Literal["shortest", "covered", "shaded", "comfortable", "emergency"]


# ---------------------------------------------------------------------------
# In-memory graph representation
# ---------------------------------------------------------------------------

@dataclass
class MockGraph:
    """
    Container for the building graph data.

    nodes: dict[node_id, node_attrs]
        Required keys: id, name, floor, x, y, type, comfort_score
        type must be one of: "room" | "hallway" | "stair" | "exit"

    edges: list[edge_attrs]
        Required keys: source, target, distance, is_covered, is_shaded, status
        status must be one of: "open" | "blocked_by_fire" | "blocked_by_flood"
    """
    nodes: dict[str, dict] = field(default_factory=dict)
    edges: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Mock building data
# ---------------------------------------------------------------------------
#
# Layout (Ground Floor unless noted):
#
#   [entrance] ──── hallway_g ──── [lobby]
#       │                              │
#   hallway_g ── stair_g ── hallway_2f (2F)
#       │                              │
#   [admin]                        [lecture_1]
#       │                              │
#   [exit_front]               [hallway_2f_b]
#                                      │
#                                  [exit_rear] (2F emergency exit)
#
# Shade/coverage legend:
#   is_covered=True  → has a roof        (good for Rain)
#   is_shaded=True   → shaded walkway    (good for Clear/sunny)
#   Both can be true at the same time (e.g. a covered-and-shaded arcade).
#
# One edge is pre-blocked to demonstrate emergency re-routing.

MOCK_GRAPH = MockGraph(
    nodes={
        # --- Ground floor ---
        # lat/lng sourced from mockData.js ROOMS where a match exists.
        # Nodes without a matching room use geographically consistent positions
        # within the same building cluster (Sta. Mesa, Manila).
        "node_entrance": {
            "id": "node_entrance", "name": "Main Entrance", "floor": 1,
            "x": 0.0, "y": 0.0, "type": "room", "comfort_score": 70.0,
            "lat": 14.5990, "lng": 120.9848,   # matches ROOMS 'entrance'
        },
        "node_hallway_g": {
            "id": "node_hallway_g", "name": "Ground Floor Hallway", "floor": 1,
            "x": 1.0, "y": 0.0, "type": "hallway", "comfort_score": 65.0,
            "lat": 14.5995, "lng": 120.9845,   # matches ROOMS 'hallway'
        },
        "node_lobby": {
            "id": "node_lobby", "name": "Lobby", "floor": 1,
            "x": 2.0, "y": 0.0, "type": "room", "comfort_score": 80.0,
            "lat": 14.5995, "lng": 120.9850,   # no direct match; east of hallway
        },
        "node_admin": {
            "id": "node_admin", "name": "Admin Office", "floor": 1,
            "x": 1.0, "y": -1.0, "type": "room", "comfort_score": 75.0,
            "lat": 14.5991, "lng": 120.9841,   # matches ROOMS 'admin'
        },
        "node_stair_g": {
            "id": "node_stair_g", "name": "Stairwell (Ground)", "floor": 1,
            "x": 1.5, "y": 0.5, "type": "stair", "comfort_score": 60.0,
            "lat": 14.5997, "lng": 120.9847,   # no direct match; between hallway and lobby
        },
        "node_exit_front": {
            "id": "node_exit_front", "name": "Front Exit", "floor": 1,
            "x": 0.0, "y": -1.5, "type": "exit", "comfort_score": 100.0,
            "lat": 14.5987, "lng": 120.9848,   # no direct match; south of entrance
        },
        # --- Second floor ---
        "node_hallway_2f": {
            "id": "node_hallway_2f", "name": "2nd Floor Hallway", "floor": 2,
            "x": 1.5, "y": 1.5, "type": "hallway", "comfort_score": 72.0,
            "lat": 14.5999, "lng": 120.9848,   # no direct match; above ground hallway
        },
        "node_lecture_1": {
            "id": "node_lecture_1", "name": "Lecture Room 1", "floor": 2,
            "x": 2.5, "y": 1.5, "type": "room", "comfort_score": 85.0,
            "lat": 14.6002, "lng": 120.9852,   # matches ROOMS 'lecture-1'
        },
        "node_hallway_2f_b": {
            "id": "node_hallway_2f_b", "name": "2nd Floor Rear Hallway", "floor": 2,
            "x": 2.5, "y": 2.5, "type": "hallway", "comfort_score": 68.0,
            "lat": 14.6003, "lng": 120.9854,   # no direct match; north-east of lecture room
        },
        "node_exit_rear": {
            "id": "node_exit_rear", "name": "Rear Emergency Exit", "floor": 2,
            "x": 3.0, "y": 3.0, "type": "exit", "comfort_score": 100.0,
            "lat": 14.6004, "lng": 120.9856,   # no direct match; rear of building
        },
    },
    edges=[
        # entrance → ground hallway (covered arcade, partially shaded by trees)
        {
            "source": "node_entrance", "target": "node_hallway_g",
            "distance": 10.0, "is_covered": True, "is_shaded": True, "status": "open",
        },
        # ground hallway → lobby (covered interior corridor)
        {
            "source": "node_hallway_g", "target": "node_lobby",
            "distance": 15.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # ground hallway → admin (open-air side path, shaded by trees)
        {
            "source": "node_hallway_g", "target": "node_admin",
            "distance": 12.0, "is_covered": False, "is_shaded": True, "status": "open",
        },
        # admin → front exit (open-air, no shade)
        {
            "source": "node_admin", "target": "node_exit_front",
            "distance": 8.0, "is_covered": False, "is_shaded": False, "status": "open",
        },
        # entrance → front exit (direct open-air shortcut, no shade)
        # Pre-blocked to demonstrate emergency re-routing around hazards.
        {
            "source": "node_entrance", "target": "node_exit_front",
            "distance": 5.0, "is_covered": False, "is_shaded": False,
            "status": "blocked_by_fire",
        },
        # ground hallway → stairwell
        {
            "source": "node_hallway_g", "target": "node_stair_g",
            "distance": 8.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # lobby → stairwell (covered, no shade)
        {
            "source": "node_lobby", "target": "node_stair_g",
            "distance": 6.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # stairwell → 2nd floor hallway
        {
            "source": "node_stair_g", "target": "node_hallway_2f",
            "distance": 10.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # 2nd floor hallway → lecture room 1 (interior, covered)
        {
            "source": "node_hallway_2f", "target": "node_lecture_1",
            "distance": 12.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # lecture room 1 → rear hallway (interior, covered)
        {
            "source": "node_lecture_1", "target": "node_hallway_2f_b",
            "distance": 10.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # rear hallway → rear exit (covered fire-escape landing)
        {
            "source": "node_hallway_2f_b", "target": "node_exit_rear",
            "distance": 5.0, "is_covered": True, "is_shaded": False, "status": "open",
        },
        # lobby → 2nd floor hallway via open exterior stair (unshaded, uncovered)
        # Shorter distance than the stairwell route, but penalised in rain/sun.
        {
            "source": "node_lobby", "target": "node_hallway_2f",
            "distance": 14.0, "is_covered": False, "is_shaded": False, "status": "open",
        },
    ],
)


# ---------------------------------------------------------------------------
# Core routing helpers
# ---------------------------------------------------------------------------

def resolve_preference(
    weather_condition: str,
    emergency: bool,
) -> _Preference:
    """
    Convert the two input signals into a single concrete preference string.

    Priority (first match wins):
        1. emergency=True  → "emergency"  (safety overrides weather)
        2. Rain            → "covered"    (avoid getting wet)
        3. Clear           → "shaded"     (avoid direct sun exposure)
        4. anything else   → "shortest"   (neutral conditions)

    The weather_condition string is compared case-insensitively so
    "clear", "Clear", and "CLEAR" all work.
    """
    if emergency:
        return "emergency"
    condition = weather_condition.strip().lower()
    if condition == "rain":
        return "covered"
    if condition == "clear":
        return "shaded"
    return "shortest"


def compute_edge_weight(
    edge: dict,
    nodes: dict[str, dict],
    preference: _Preference,
) -> float:
    """
    Returns the effective routing weight for one edge.

    Blocked edges always return inf — the pathfinder never traverses them.
    This guard applies in every mode including emergency.

    Penalty table (applied on top of raw distance):
        covered    → +100 m per uncovered segment
        shaded     → +50 m per unshaded segment
        comfortable→ +(100 − comfort_score) × 2 m per edge
        shortest   → no penalty
        emergency  → no penalty beyond the blocked-edge guard
                     (emergency uses a separate graph; this branch is never
                      reached for that preference, but it's listed for clarity)
    """
    if edge.get("status", "open") != "open":
        return float("inf")

    weight = edge["distance"]

    if preference == "covered":
        if not edge.get("is_covered", True):
            weight += 100.0

    elif preference == "shaded":
        if not edge.get("is_shaded", False):
            weight += 50.0

    elif preference == "comfortable":
        target_id = edge["target"]
        comfort = nodes.get(target_id, {}).get("comfort_score", 100.0)
        weight += (100.0 - comfort) * 2.0

    return weight


def _build_graph(mock: MockGraph, preference: _Preference) -> nx.Graph:
    """
    Build and return a weighted networkx Graph from a MockGraph.

    For 'emergency' preference only the blocked-edge guard is applied;
    comfort, shade, and coverage penalties are irrelevant during evacuation.
    For all other preferences compute_edge_weight() is called per edge.
    """
    G = nx.Graph()

    for node_id, attrs in mock.nodes.items():
        G.add_node(node_id, **attrs)

    for edge in mock.edges:
        if preference == "emergency":
            # Emergency: only respect hazard blocks, no comfort/weather bias.
            w = float("inf") if edge.get("status", "open") != "open" else edge["distance"]
        else:
            w = compute_edge_weight(edge, mock.nodes, preference)

        G.add_edge(edge["source"], edge["target"], weight=w, **edge)

    return G


def _find_path(
    G: nx.Graph,
    nodes: dict[str, dict],
    start: str,
    end: str,
    preference: _Preference,
) -> list[str]:
    """
    Run Dijkstra on G and return the winning path as a list of node IDs.

    For 'emergency': end is ignored.  All nodes whose type == "exit" are
    candidates.  We probe each with shortest_path_length (O(E log V) per
    exit), skip unreachable ones, and run shortest_path to the winner.

    For all other preferences: standard shortest_path from start to end.

    Raises nx.NetworkXNoPath if no path exists (caller converts to HTTP 400).
    Raises nx.NodeNotFound if start/end is not in the graph (→ HTTP 404).
    """
    if preference == "emergency":
        exit_nodes = [nid for nid, d in nodes.items() if d.get("type") == "exit"]
        if not exit_nodes:
            # Propagate as NodeNotFound so main.py converts it to 404.
            raise nx.NodeNotFound("No exit nodes defined in the building graph.")

        best_exit: str | None = None
        best_cost: float = float("inf")

        for exit_id in exit_nodes:
            try:
                cost = nx.shortest_path_length(G, source=start, target=exit_id, weight="weight")
                if cost < best_cost:
                    best_cost = cost
                    best_exit = exit_id
            except (nx.NodeNotFound, nx.NetworkXNoPath):
                continue  # This exit is unreachable; try the next one.

        if best_exit is None:
            raise nx.NetworkXNoPath()

        return nx.shortest_path(G, source=start, target=best_exit, weight="weight")

    # Normal routing: route to the requested destination.
    return nx.shortest_path(G, source=start, target=end, weight="weight")


def _format_path(path: list[str], nodes: dict[str, dict]) -> list[dict]:
    """
    Convert a list of node IDs into the detailed_path array the API returns.
    Keys match exactly what the existing /api/navigate endpoint produces.
    lat and lng are included for 2D map visualisation; x and y are retained
    for graph routing weights and the future 3D viewer.
    """
    return [
        {
            "id": nid,
            "name": nodes.get(nid, {}).get("name", nid),
            "floor": nodes.get(nid, {}).get("floor"),
            "x": nodes.get(nid, {}).get("x"),
            "y": nodes.get(nid, {}).get("y"),
            "lat": nodes.get(nid, {}).get("lat"),
            "lng": nodes.get(nid, {}).get("lng"),
            "comfort_score": nodes.get(nid, {}).get("comfort_score", 100.0),
        }
        for nid in path
    ]


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------

def navigate_mock(
    start: str,
    end: str,
    weather_condition: str = "Cloudy",
    emergency: bool = False,
    mock: MockGraph = MOCK_GRAPH,
) -> dict:
    """
    Compute a route using the in-memory mock graph and return a response dict
    whose shape is identical to the existing /api/navigate endpoint:

        {
            "status": "success",
            "navigation_preference": <str>,   # the resolved preference
            "total_steps": <int>,
            "route_sequence": [<node_id>, ...],
            "detailed_path": [
                {
                    "id": <str>,
                    "name": <str>,
                    "floor": <int>,
                    "x": <float>,        # graph coordinate — used for routing weights and 3D viewer
                    "y": <float>,        # graph coordinate — used for routing weights and 3D viewer
                    "lat": <float>,      # WGS84 latitude  — used for 2D map visualisation
                    "lng": <float>,      # WGS84 longitude — used for 2D map visualisation
                    "comfort_score": <float>,
                },
                ...
            ],
        }

    Parameters
    ----------
    start : str
        Node ID of the origin (e.g. "node_entrance").
    end : str
        Node ID of the destination.  Ignored when emergency=True.
    weather_condition : str
        "Clear", "Rain", or "Cloudy" (default).  Case-insensitive.
    emergency : bool
        When True, routes to the nearest reachable exit node regardless of
        weather_condition and end.
    mock : MockGraph
        Defaults to MOCK_GRAPH.  Pass a custom instance for unit tests.

    Raises
    ------
    nx.NodeNotFound    — start node does not exist, or no exits defined.
    nx.NetworkXNoPath  — destination is unreachable given current blockages.
    """
    preference = resolve_preference(weather_condition, emergency)
    G = _build_graph(mock, preference)
    path = _find_path(G, mock.nodes, start, end, preference)
    detailed = _format_path(path, mock.nodes)

    return {
        "status": "success",
        "navigation_preference": preference,
        "total_steps": len(path),
        "route_sequence": path,
        "detailed_path": detailed,
    }
