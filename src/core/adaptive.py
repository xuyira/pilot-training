from __future__ import annotations

from typing import Any


def decide_next_level(module_name: str, current_level: str, metrics: dict[str, Any], adaptive_config: dict[str, Any]) -> tuple[str, str]:
    if metrics.get("implemented"):
        return current_level, "hold"
    return current_level, "hold"
