from __future__ import annotations

from statistics import mean
from typing import Any


def build_placeholder_metrics(events: list[dict[str, Any]]) -> dict[str, Any]:
    key_events = [event for event in events if event.get("event_type") == "response"]
    reaction_times = [event["reaction_time_ms"] for event in key_events if isinstance(event.get("reaction_time_ms"), (int, float))]
    total_events = len(events)
    total_responses = len(key_events)
    return {
        "total_events": total_events,
        "total_responses": total_responses,
        "mean_rt": round(mean(reaction_times), 2) if reaction_times else None,
        "implemented": False,
    }
