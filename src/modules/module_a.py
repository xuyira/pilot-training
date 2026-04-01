from __future__ import annotations

from src.modules.base import ModuleSpec


MODULE_A_SPEC = ModuleSpec(
    name="module_a",
    key_hints="Press SPACE for target alarms. ESC quits the block.",
    intro_lines=[
        "Composite Module A",
        "Sustained monitoring and response control",
        "This build wires the shared flow, logging, and marker hooks.",
        "Detailed event generation will be implemented in the next phase."
    ],
    placeholder_events=["target_alarm", "pseudo_alarm", "noncritical_change"],
)
