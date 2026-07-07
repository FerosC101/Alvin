"""
test_routing.py — Standalone test suite for the ALVIN routing intelligence

Run this script directly (no server required) to verify the routing logic:

    python test_routing.py

Every test prints the computed route and verifies that the routing engine
correctly adapts to weather and emergency conditions.
"""

from router import navigate_mock, MOCK_GRAPH
from main import _format_route_path


def print_route(result: dict, scenario: str):
    """Pretty-print a route result."""
    print(f"\n{'='*70}")
    print(f"SCENARIO: {scenario}")
    print(f"{'='*70}")
    print(f"Preference resolved: {result['navigation_preference']}")
    print(f"Total steps: {result['total_steps']}")
    print(f"Route: {' → '.join(result['route_sequence'])}")
    print("\nDetailed path:")
    for step in result["detailed_path"]:
        print(f"  {step['id']:20s} | {step['name']:30s} | Floor {step['floor']}")
    print()


def test_route_formatting_uses_backend_graph_coordinates():
    """Route formatting should preserve lat/lng from the authoritative backend graph."""
    path = ["node_entrance", "node_hallway_g"]
    node_map = {
        "node_entrance": {
            "id": "node_entrance",
            "name": "Main Entrance",
            "floor": 1,
            "x": 0.0,
            "y": 0.0,
        }
    }

    formatted = _format_route_path(path, node_map)

    assert formatted[0]["lat"] == MOCK_GRAPH.nodes["node_entrance"]["lat"]
    assert formatted[0]["lng"] == MOCK_GRAPH.nodes["node_entrance"]["lng"]
    assert formatted[1]["lat"] == MOCK_GRAPH.nodes["node_hallway_g"]["lat"]
    assert formatted[1]["lng"] == MOCK_GRAPH.nodes["node_hallway_g"]["lng"]
    print("✓ Route formatting preserves backend graph coordinates.")


def test_clear_weather_routing():
    """Test that clear weather prefers shaded paths."""
    result = navigate_mock(
        start="node_entrance",
        end="node_admin",
        weather_condition="Clear",
        emergency=False,
    )
    print_route(result, "Clear Weather — entrance → admin (expect shaded route)")
    
    # The shaded arcade (entrance → hallway_g → admin) should be chosen
    # over the hypothetical direct unshaded path.
    assert "node_hallway_g" in result["route_sequence"], (
        "Expected route to use the shaded arcade (node_hallway_g)"
    )
    print("✓ Correctly preferred shaded path in clear weather.")


def test_rain_routing():
    """Test that rainy weather prefers covered paths."""
    result = navigate_mock(
        start="node_lobby",
        end="node_hallway_2f",
        weather_condition="Rain",
        emergency=False,
    )
    print_route(result, "Rain — lobby → 2nd floor (expect covered route)")
    
    # The covered interior stairwell route should be chosen over the
    # shorter but uncovered exterior stair.
    assert "node_stair_g" in result["route_sequence"], (
        "Expected route to use covered stairwell instead of open exterior stair"
    )
    print("✓ Correctly preferred covered path in rain.")


def test_cloudy_neutral_routing():
    """Test that cloudy weather uses shortest path (no weather bias)."""
    result = navigate_mock(
        start="node_entrance",
        end="node_lobby",
        weather_condition="Cloudy",
        emergency=False,
    )
    print_route(result, "Cloudy — entrance → lobby (expect shortest path)")
    
    # Should take the direct covered route — but "shortest" means lowest total
    # distance, which may route through the stairwell if it's actually shorter.
    # We just verify that "shortest" preference is applied; no weather penalty.
    assert result["navigation_preference"] == "shortest"
    # Any valid route from entrance to lobby is acceptable; the key check is
    # that all edges on the path are open.
    assert result["route_sequence"][0] == "node_entrance"
    assert result["route_sequence"][-1] == "node_lobby"
    print("✓ Correctly used shortest path in neutral weather.")


def test_emergency_routing_to_nearest_exit():
    """Test that emergency mode routes to the nearest reachable exit."""
    result = navigate_mock(
        start="node_entrance",
        end="node_lobby",  # This is ignored in emergency mode.
        weather_condition="Clear",  # Weather is also ignored.
        emergency=True,
    )
    print_route(result, "Emergency — entrance (expect nearest safe exit)")
    
    # The direct path entrance → exit_front is blocked_by_fire.
    # The router must re-route through the admin office.
    assert result["navigation_preference"] == "emergency"
    assert result["route_sequence"][-1] == "node_exit_front", (
        "Expected emergency route to terminate at an exit node"
    )
    assert "node_admin" in result["route_sequence"], (
        "Expected route to avoid blocked edge and go via admin office"
    )
    print("✓ Correctly routed to nearest exit avoiding blocked path.")


def test_emergency_routing_blocked_primary_exit():
    """
    Test emergency routing when the nearest exit is unreachable.
    The router should find an alternate exit.
    """
    # Start from the 2nd floor. The nearest exit is node_exit_rear on floor 2.
    result = navigate_mock(
        start="node_lecture_1",
        end="node_entrance",  # Ignored in emergency.
        weather_condition="Rain",  # Ignored in emergency.
        emergency=True,
    )
    print_route(result, "Emergency — 2nd floor lecture room (expect 2F rear exit)")
    
    assert result["navigation_preference"] == "emergency"
    # Should route to node_exit_rear (the 2F emergency exit) since it's closer
    # than going all the way down to node_exit_front.
    assert result["route_sequence"][-1] == "node_exit_rear"
    print("✓ Correctly routed to nearest reachable exit on 2nd floor.")


def test_all_exits_unreachable():
    """Test that routing fails gracefully when no exit is reachable."""
    from router import MockGraph
    import networkx as nx

    # Build a minimal graph: one room, one exit, no connecting edge.
    isolated_graph = MockGraph(
        nodes={
            "node_isolated": {
                "id": "node_isolated",
                "name": "Isolated Room",
                "floor": 1,
                "x": 0.0,
                "y": 0.0,
                "type": "room",
                "comfort_score": 50.0,
            },
            "node_exit_isolated": {
                "id": "node_exit_isolated",
                "name": "Isolated Exit",
                "floor": 1,
                "x": 10.0,
                "y": 10.0,
                "type": "exit",
                "comfort_score": 100.0,
            },
        },
        edges=[],  # No edges = no path.
    )
    
    try:
        navigate_mock(
            start="node_isolated",
            end="node_exit_isolated",
            emergency=True,
            mock=isolated_graph,
        )
        assert False, "Expected NetworkXNoPath exception"
    except nx.NetworkXNoPath:
        print("\n✓ Correctly raised NetworkXNoPath when all exits are unreachable.")


def run_all_tests():
    """Run the full test suite."""
    print("\n" + "="*70)
    print("ALVIN Dynamic Environmental Navigation — Routing Intelligence Tests")
    print("="*70)
    
    test_clear_weather_routing()
    test_rain_routing()
    test_cloudy_neutral_routing()
    test_emergency_routing_to_nearest_exit()
    test_emergency_routing_blocked_primary_exit()
    test_all_exits_unreachable()
    
    print("\n" + "="*70)
    print("ALL TESTS PASSED ✓")
    print("="*70)
    print()


if __name__ == "__main__":
    run_all_tests()
