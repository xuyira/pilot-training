from __future__ import annotations

from statistics import mean, pstdev
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


def build_module_a_metrics(events: list[dict[str, Any]]) -> dict[str, Any]:
    target_events = [event for event in events if event.get("event_subtype") == "target_alarm_onset"]
    correct_events = [event for event in events if event.get("event_subtype") == "target_correct"]
    miss_events = [event for event in events if event.get("event_subtype") == "target_miss"]
    false_events = [event for event in events if event.get("event_subtype") == "false_alarm"]
    window_events = [event for event in events if event.get("event_subtype") == "adaptive_window"]

    reaction_times = [
        event["reaction_time_ms"]
        for event in correct_events
        if isinstance(event.get("reaction_time_ms"), (int, float))
    ]
    hit_count = len(correct_events)
    miss_count = len(miss_events)
    false_alarm_count = len(false_events)
    target_count = len(target_events)
    denominator = target_count or 1

    drift = None
    if window_events:
        first_half = window_events[: max(1, len(window_events) // 2)]
        second_half = window_events[len(window_events) // 2 :]
        if second_half:
            first_hit = mean(float(event.get("window_hit_rate", 0.0)) for event in first_half)
            second_hit = mean(float(event.get("window_hit_rate", 0.0)) for event in second_half)
            drift = round(second_hit - first_hit, 3)

    return {
        "implemented": True,
        "target_count": target_count,
        "hit_rate": round(hit_count / denominator, 3),
        "miss_rate": round(miss_count / denominator, 3),
        "false_alarm_rate": round(false_alarm_count / denominator, 3),
        "mean_rt": round(mean(reaction_times), 2) if reaction_times else None,
        "rt_std": round(pstdev(reaction_times), 2) if len(reaction_times) > 1 else 0.0 if reaction_times else None,
        "performance_drift": drift,
        "window_count": len(window_events),
    }
