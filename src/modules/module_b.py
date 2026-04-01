from __future__ import annotations

from src.modules.base import ModuleSpec


MODULE_B_SPEC = ModuleSpec(
    name="module_b",
    key_hints="Press J/K/L for task areas. ESC quits the block.",
    intro_lines=[
        "Composite Module B",
        "Dynamic task management",
        "This build wires the shared flow, logging, and marker hooks.",
        "Detailed rule updates and priority logic will be implemented in the next phase."
    ],
    placeholder_events=["task_control", "task_navigation", "task_communication"],
)
