from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class AppAssets:
    fonts: dict[str, Any]
    colors: dict[str, tuple[int, int, int]]
