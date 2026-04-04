from __future__ import annotations

from typing import Any


def decide_next_level(module_name: str, current_level: str, metrics: dict[str, Any], adaptive_config: dict[str, Any]) -> tuple[str, str]:
    levels = ["L1", "L2", "L3", "L4", "L5"]

    def shift(level: str, delta: int) -> str:
        index = max(0, min(len(levels) - 1, levels.index(level) + delta))
        return levels[index]

    if not metrics.get("implemented"):
        return current_level, "hold"

    if module_name == "module_b":
        thresholds = adaptive_config.get("module_b", {})
        accuracy = float(metrics.get("correct_rate", 0.0))
        priority_accuracy = float(metrics.get("priority_accuracy", 1.0) if metrics.get("priority_accuracy") is not None else 1.0)
        rule_violation_rate = float(metrics.get("rule_violation_rate", 0.0))
        timeout_rate = float(metrics.get("timeout_rate", 0.0))
        mean_decision_time = metrics.get("mean_decision_time_ms")

        good_window = (
            accuracy >= thresholds.get("assignment_accuracy_min", 1.0)
            and priority_accuracy >= thresholds.get("priority_accuracy_min", 1.0)
            and rule_violation_rate <= thresholds.get("rule_violation_rate_max", 0.0)
            and timeout_rate <= thresholds.get("timeout_rate_max", 0.0)
            and (mean_decision_time is None or mean_decision_time <= thresholds.get("mean_decision_time_ms_max", 0))
        )
        poor_window = (
            rule_violation_rate > thresholds.get("rule_violation_rate_max", 0.0)
            or timeout_rate > thresholds.get("timeout_rate_max", 0.0)
            or priority_accuracy < thresholds.get("priority_accuracy_min", 1.0) * 0.9
            or (mean_decision_time is not None and mean_decision_time > thresholds.get("mean_decision_time_ms_max", 0) * 1.1)
        )

        if good_window:
            next_level = shift(current_level, 1)
            return next_level, "up" if next_level != current_level else "hold"
        if poor_window:
            next_level = shift(current_level, -1)
            return next_level, "down" if next_level != current_level else "hold"
        return current_level, "hold"

    return current_level, "hold"
