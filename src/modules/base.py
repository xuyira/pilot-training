from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from src.core.metrics import build_module_a_metrics, build_module_b_metrics, build_placeholder_metrics
from src.data.models import BlockSummary, SessionContext


@dataclass
class ModuleSpec:
    name: str
    key_hints: str
    intro_lines: list[str]
    placeholder_events: list[str]


def build_block_summary(
    context: SessionContext,
    block_id: int,
    start_level: str,
    end_level: str,
    events: list[dict[str, Any]],
    notes: str,
) -> BlockSummary:
    if context.selection.module_name == "module_a":
        metrics = build_module_a_metrics(events)
    elif context.selection.module_name == "module_b":
        metrics = build_module_b_metrics(events)
    else:
        metrics = build_placeholder_metrics(events)
    return BlockSummary(
        subject_id=context.participant.subject_id,
        session_id=context.participant.session_id,
        module_name=context.selection.module_name,
        block_id=block_id,
        difficulty_level_start=start_level,
        difficulty_level_end=end_level,
        total_events=len(events),
        accuracy_metrics=metrics,
        adaptive_decision="hold",
        notes=notes,
    )


def build_response_event(
    context: SessionContext,
    block_id: int,
    level: str,
    key_name: str,
    reaction_time_ms: int,
) -> dict[str, Any]:
    return {
        "timestamp_system": datetime.now().isoformat(timespec="milliseconds"),
        "timestamp_relative": "",
        "subject_id": context.participant.subject_id,
        "session_id": context.participant.session_id,
        "module_name": context.selection.module_name,
        "block_id": block_id,
        "difficulty_level": level,
        "event_type": "response",
        "event_subtype": "placeholder_key",
        "zone_or_task_area": "",
        "expected_action": "",
        "actual_action": key_name,
        "correctness": "pending",
        "reaction_time_ms": reaction_time_ms,
        "adapt_action": "none",
        "adapt_dimension": "none",
        "marker_code": "",
    }
