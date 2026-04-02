from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from src.core.logger import SessionLogger
from src.core.marker import MarkerClient
from src.data.models import ParticipantInfo, RunSelection, SessionContext
from src.modules.base import build_block_summary
from src.modules.module_a import MODULE_A_SPEC
from src.modules.module_b import MODULE_B_SPEC


@dataclass
class ActiveSession:
    token: str
    context: SessionContext
    session_logger: SessionLogger
    marker_client: MarkerClient
    config_bundle: dict[str, Any]
    events: list[dict[str, Any]] = field(default_factory=list)
    block_active: bool = False
    current_level: str = ""
    last_adapt_action: str = "hold"


class SessionManager:
    def __init__(self, root_dir: Path, config_bundle: dict[str, Any]) -> None:
        self.root_dir = root_dir
        self.config_bundle = config_bundle
        self.sessions: dict[str, ActiveSession] = {}

    def bootstrap_payload(self) -> dict[str, Any]:
        base = self.config_bundle["base"]
        return {
            "app": base["app"],
            "ui": base["ui"],
            "adaptive": base["adaptive"],
            "modules": {
                "module_a": {
                    "label": "持续监控与响应控制训练",
                    "description": "持续监控与响应控制",
                    "keyHints": MODULE_A_SPEC.key_hints,
                    "introLines": MODULE_A_SPEC.intro_lines,
                    "levels": self.config_bundle["module_a_levels"],
                },
                "module_b": {
                    "label": "动态任务管理训练",
                    "description": "动态任务管理",
                    "keyHints": MODULE_B_SPEC.key_hints,
                    "introLines": MODULE_B_SPEC.intro_lines,
                    "levels": self.config_bundle["module_b_levels"],
                },
            },
            "modes": [
                {"value": "fixed", "label": "固定难度"},
                {"value": "adaptive", "label": "自适应难度"},
            ],
            "levels": ["L1", "L2", "L3", "L4", "L5"],
        }

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        participant = ParticipantInfo(
            subject_id=payload["subject_id"].strip(),
            session_id=payload["session_id"].strip(),
            experimenter=payload.get("experimenter", "").strip(),
        )
        selection = RunSelection(
            module_name=payload["module_name"],
            mode=payload["mode"],
            start_level=payload["start_level"],
            duration_minutes=max(1, int(payload.get("duration_minutes", 1))),
        )
        context = SessionContext(
            participant=participant,
            selection=selection,
            software_version=self.config_bundle["base"]["app"]["version"],
        )
        session_logger = SessionLogger(self.root_dir, self.config_bundle["base"])
        session_dir = session_logger.start_session(context, self.config_bundle)
        marker_client = MarkerClient(self.config_bundle["marker_map"], session_logger)
        token = uuid4().hex
        self.sessions[token] = ActiveSession(
            token=token,
            context=context,
            session_logger=session_logger,
            marker_client=marker_client,
            config_bundle=self.config_bundle,
            current_level=selection.start_level,
        )
        return {
            "sessionToken": token,
            "sessionDir": str(session_dir),
            "selection": {
                "moduleName": selection.module_name,
                "mode": selection.mode,
                "startLevel": selection.start_level,
                "durationMinutes": selection.duration_minutes,
                "blockId": selection.block_id,
            },
        }

    def start_block(self, token: str) -> dict[str, Any]:
        session = self._session(token)
        session.events = []
        session.block_active = True
        context = session.context
        level = context.selection.start_level
        block_id = context.selection.block_id
        module_name = context.selection.module_name
        session.current_level = level
        session.last_adapt_action = "hold"
        session.marker_client.send_marker(context, "block_start", block_id, level)
        session.marker_client.send_marker(
            context,
            "module_A_start" if module_name == "module_a" else "module_B_start",
            block_id,
            level,
        )
        session.marker_client.send_marker(
            context,
            "difficulty_level",
            block_id,
            level,
            {"actual_action": level},
        )
        return {
            "blockId": block_id,
            "durationSeconds": context.selection.duration_minutes * 60,
            "moduleName": module_name,
            "level": level,
            "levelConfig": self._module_level_config(module_name, level),
            "moduleSpec": self._module_spec(module_name),
        }

    def log_event(self, token: str, payload: dict[str, Any]) -> dict[str, Any]:
        session = self._session(token)
        if not session.block_active:
            raise ValueError("Block is not active.")
        context = session.context
        level = str(payload.get("difficulty_level", session.current_level or context.selection.start_level))
        adapt_action = str(payload.get("adapt_action", "none"))
        adapt_dimension = str(payload.get("adapt_dimension", "none"))
        row = {
            "timestamp_system": datetime.now().isoformat(timespec="milliseconds"),
            "timestamp_relative": f"{session.session_logger.relative_timestamp():.3f}",
            "subject_id": context.participant.subject_id,
            "session_id": context.participant.session_id,
            "module_name": context.selection.module_name,
            "block_id": context.selection.block_id,
            "difficulty_level": level,
            "event_type": payload.get("event_type", "response"),
            "event_subtype": payload.get("event_subtype", "placeholder_key"),
            "zone_or_task_area": payload.get("zone_or_task_area", ""),
            "expected_action": payload.get("expected_action", ""),
            "actual_action": payload.get("actual_action", ""),
            "correctness": payload.get("correctness", "pending"),
            "reaction_time_ms": payload.get("reaction_time_ms", ""),
            "adapt_action": adapt_action,
            "adapt_dimension": adapt_dimension,
            "marker_code": "",
        }
        extra_fields = {
            key: value
            for key, value in payload.items()
            if key not in row and key not in {"marker_event_name"}
        }
        row.update(extra_fields)

        marker_event_name = payload.get("marker_event_name")
        if marker_event_name:
            marker_code = session.marker_client.send_marker(
                context,
                str(marker_event_name),
                context.selection.block_id,
                level,
                {
                    "zone_or_task_area": row["zone_or_task_area"],
                    "expected_action": row["expected_action"],
                    "actual_action": row["actual_action"],
                    "correctness": row["correctness"],
                    "reaction_time_ms": row["reaction_time_ms"],
                    "adapt_action": adapt_action,
                    "adapt_dimension": adapt_dimension,
                },
            )
            row["marker_code"] = marker_code

        if level != session.current_level:
            session.current_level = level

        if adapt_action in {"up", "down", "hold"}:
            session.last_adapt_action = adapt_action

        session.events.append(row)
        session.session_logger.log_event(row)
        return {"eventCount": len(session.events)}

    def complete_block(self, token: str) -> dict[str, Any]:
        session = self._session(token)
        context = session.context
        level = context.selection.start_level
        block_id = context.selection.block_id
        next_level = session.current_level or level
        adapt_action = session.last_adapt_action
        session.marker_client.send_marker(
            context,
            "module_A_end" if context.selection.module_name == "module_a" else "module_B_end",
            block_id,
            next_level,
        )
        session.marker_client.send_marker(context, "block_end", block_id, next_level)
        summary = build_block_summary(
            context=context,
            block_id=block_id,
            start_level=level,
            end_level=next_level,
            events=session.events,
            notes="Module A immersive block executed." if context.selection.module_name == "module_a" else "Web placeholder block executed. Module internals pending.",
        )
        summary.adaptive_decision = adapt_action
        session.session_logger.log_block_summary(summary)
        session.block_active = False
        context.selection.block_id += 1
        context.selection.start_level = next_level
        return {
            "summary": {
                "moduleName": summary.module_name,
                "blockId": summary.block_id,
                "difficultyLevelStart": summary.difficulty_level_start,
                "difficultyLevelEnd": summary.difficulty_level_end,
                "totalEvents": summary.total_events,
                "accuracyMetrics": summary.accuracy_metrics,
                "adaptiveDecision": summary.adaptive_decision,
                "notes": summary.notes,
            },
            "adaptAction": adapt_action,
            "sessionDir": str(session.session_logger.session_dir) if session.session_logger.session_dir else "",
        }

    def _session(self, token: str) -> ActiveSession:
        if token not in self.sessions:
            raise KeyError("Session not found.")
        return self.sessions[token]

    def _module_level_config(self, module_name: str, level: str) -> dict[str, Any]:
        key = "module_a_levels" if module_name == "module_a" else "module_b_levels"
        return self.config_bundle[key][level]

    def _module_spec(self, module_name: str) -> dict[str, Any]:
        spec = MODULE_A_SPEC if module_name == "module_a" else MODULE_B_SPEC
        return {
            "name": spec.name,
            "keyHints": spec.key_hints,
            "introLines": spec.intro_lines,
            "placeholderEvents": spec.placeholder_events,
        }
