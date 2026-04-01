from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ConfigLoader:
    def __init__(self, root_dir: Path) -> None:
        self.root_dir = root_dir
        self.config_dir = root_dir / "config"

    def load_json(self, filename: str) -> dict[str, Any]:
        file_path = self.config_dir / filename
        with file_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def load_all(self) -> dict[str, Any]:
        return {
            "base": self.load_json("base_config.json"),
            "module_a_levels": self.load_json("module_a_levels.json"),
            "module_b_levels": self.load_json("module_b_levels.json"),
            "marker_map": self.load_json("marker_map.json"),
        }
