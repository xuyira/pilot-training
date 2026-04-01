from __future__ import annotations

from datetime import datetime
from typing import Any

from src.core.logger import SessionLogger
from src.data.models import SessionContext


class MarkerClient:
    def __init__(self, marker_map: dict[str, int], session_logger: SessionLogger, enabled: bool = False) -> None:
        self.marker_map = marker_map
        self.session_logger = session_logger
        self.enabled = enabled

    def send_marker(
        self,
        context: SessionContext,
        event_name: str,
        block_id: int,
        difficulty_level: str,
        extra_info: dict[str, Any] | None = None,
    ) -> int:
        marker_code = self.marker_map.get(event_name, -1)
        payload = extra_info or {}
        self.session_logger.log_event(
            {
                "timestamp_system": datetime.now().isoformat(timespec="milliseconds"),
                "timestamp_relative": f"{self.session_logger.relative_timestamp():.3f}",
                "subject_id": context.participant.subject_id,
                "session_id": context.participant.session_id,
                "module_name": context.selection.module_name,
                "block_id": block_id,
                "difficulty_level": difficulty_level,
                "event_type": "marker",
                "event_subtype": event_name,
                "zone_or_task_area": payload.get("zone_or_task_area", ""),
                "expected_action": payload.get("expected_action", ""),
                "actual_action": payload.get("actual_action", ""),
                "correctness": payload.get("correctness", ""),
                "reaction_time_ms": payload.get("reaction_time_ms", ""),
                "adapt_action": payload.get("adapt_action", "none"),
                "adapt_dimension": payload.get("adapt_dimension", "none"),
                "marker_code": marker_code,
            }
        )
        return marker_code
