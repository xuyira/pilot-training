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


def build_module_b_metrics(events: list[dict[str, Any]]) -> dict[str, Any]:
    assignment_events = [event for event in events if event.get("event_subtype") == "task_assignment"]
    timeout_events = [event for event in events if event.get("event_subtype") == "task_timeout"]
    update_events = [event for event in events if event.get("event_subtype") == "rule_update"]
    window_events = [event for event in events if event.get("event_subtype") == "adaptive_window"]

    correct_count = sum(1 for event in assignment_events if event.get("correctness") == "correct")
    priority_error_count = sum(1 for event in assignment_events if event.get("correctness") == "priority_error")
    rule_violation_count = sum(1 for event in assignment_events if event.get("correctness") == "rule_violation")
    suboptimal_count = sum(1 for event in assignment_events if event.get("correctness") == "suboptimal_assignment")

    critical_events = [event for event in assignment_events if event.get("task_priority") == "critical"]
    critical_correct = sum(1 for event in critical_events if event.get("correctness") == "correct")
    reaction_times = [
        event["reaction_time_ms"]
        for event in assignment_events
        if isinstance(event.get("reaction_time_ms"), (int, float))
    ]

    total_assignments = len(assignment_events)
    assignment_denominator = total_assignments or 1
    critical_denominator = len(critical_events) or 1
    timeout_denominator = total_assignments + len(timeout_events) or 1

    drift = None
    if window_events:
        first_half = window_events[: max(1, len(window_events) // 2)]
        second_half = window_events[len(window_events) // 2 :]
        if second_half:
            first_accuracy = mean(float(event.get("assignment_accuracy", 0.0)) for event in first_half)
            second_accuracy = mean(float(event.get("assignment_accuracy", 0.0)) for event in second_half)
            drift = round(second_accuracy - first_accuracy, 3)

    return {
        "implemented": True,
        "assignment_count": total_assignments,
        "correct_rate": round(correct_count / assignment_denominator, 3),
        "priority_accuracy": round(critical_correct / critical_denominator, 3) if critical_events else None,
        "priority_error_rate": round(priority_error_count / assignment_denominator, 3),
        "rule_violation_rate": round(rule_violation_count / assignment_denominator, 3),
        "suboptimal_rate": round(suboptimal_count / assignment_denominator, 3),
        "timeout_rate": round(len(timeout_events) / timeout_denominator, 3),
        "mean_decision_time_ms": round(mean(reaction_times), 2) if reaction_times else None,
        "rule_update_count": len(update_events),
        "window_count": len(window_events),
        "performance_drift": drift,
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
