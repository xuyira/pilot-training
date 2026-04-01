from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from src.data.models import BlockSummary, SessionContext


class SessionLogger:
    def __init__(self, root_dir: Path, base_config: dict[str, Any]) -> None:
        logs_dir = root_dir / base_config["paths"]["logs_dir"]
        logs_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir = logs_dir
        self.base_config = base_config
        self.session_dir: Path | None = None
        self.event_log_path: Path | None = None
        self.block_summary_path: Path | None = None
        self.session_meta_path: Path | None = None
        self.config_snapshot_path: Path | None = None
        self.started_at = datetime.now()

    def start_session(self, context: SessionContext, config_bundle: dict[str, Any]) -> Path:
        self.started_at = context.started_at
        timestamp = context.started_at.strftime("%Y%m%d_%H%M%S")
        safe_name = f"{context.participant.subject_id}_{context.participant.session_id}_{timestamp}"
        self.session_dir = self.logs_dir / safe_name
        self.session_dir.mkdir(parents=True, exist_ok=True)

        self.session_meta_path = self.session_dir / "session_meta.json"
        self.event_log_path = self.session_dir / "event_log.csv"
        self.block_summary_path = self.session_dir / "block_summary.csv"
        self.config_snapshot_path = self.session_dir / "config_snapshot.json"

        self._write_json(self.session_meta_path, context.meta_payload())
        self._write_json(self.config_snapshot_path, config_bundle)
        self._init_csv(self.event_log_path, self.base_config["logging"]["event_log_headers"])
        self._init_csv(self.block_summary_path, self.base_config["logging"]["block_summary_headers"])
        return self.session_dir

    def log_event(self, row: dict[str, Any]) -> None:
        if not self.event_log_path:
            raise RuntimeError("Session logger has not been started.")
        self._append_csv(self.event_log_path, self.base_config["logging"]["event_log_headers"], row)

    def log_block_summary(self, summary: BlockSummary) -> None:
        if not self.block_summary_path:
            raise RuntimeError("Session logger has not been started.")
        self._append_csv(
            self.block_summary_path,
            self.base_config["logging"]["block_summary_headers"],
            summary.to_csv_row(),
        )

    def relative_timestamp(self) -> float:
        return (datetime.now() - self.started_at).total_seconds()

    def _write_json(self, file_path: Path, payload: dict[str, Any]) -> None:
        with file_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def _init_csv(self, file_path: Path, headers: list[str]) -> None:
        with file_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=headers)
            writer.writeheader()

    def _append_csv(self, file_path: Path, headers: list[str], row: dict[str, Any]) -> None:
        normalized = {header: row.get(header, "") for header in headers}
        with file_path.open("a", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=headers)
            writer.writerow(normalized)
