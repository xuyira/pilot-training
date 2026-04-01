from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class ParticipantInfo:
    subject_id: str
    session_id: str
    experimenter: str = ""


@dataclass
class RunSelection:
    module_name: str
    mode: str
    start_level: str
    block_id: int = 1


@dataclass
class SessionContext:
    participant: ParticipantInfo
    selection: RunSelection
    software_version: str
    started_at: datetime = field(default_factory=datetime.now)

    def meta_payload(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["date_time"] = self.started_at.isoformat(timespec="seconds")
        payload["subject_id"] = self.participant.subject_id
        payload["session_id"] = self.participant.session_id
        payload["experimenter"] = self.participant.experimenter
        payload["module_name"] = self.selection.module_name
        payload["mode"] = self.selection.mode
        payload["start_level"] = self.selection.start_level
        payload["software_version"] = self.software_version
        payload.pop("participant", None)
        payload.pop("selection", None)
        payload.pop("started_at", None)
        return payload


@dataclass
class BlockSummary:
    subject_id: str
    session_id: str
    module_name: str
    block_id: int
    difficulty_level_start: str
    difficulty_level_end: str
    total_events: int
    accuracy_metrics: dict[str, Any]
    adaptive_decision: str
    notes: str = ""

    def to_csv_row(self) -> dict[str, Any]:
        return {
            "subject_id": self.subject_id,
            "session_id": self.session_id,
            "module_name": self.module_name,
            "block_id": self.block_id,
            "difficulty_level_start": self.difficulty_level_start,
            "difficulty_level_end": self.difficulty_level_end,
            "total_events": self.total_events,
            "accuracy_metrics": self.accuracy_metrics,
            "adaptive_decision": self.adaptive_decision,
            "notes": self.notes,
        }
