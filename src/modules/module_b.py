from __future__ import annotations

from src.modules.base import ModuleSpec


MODULE_B_SPEC = ModuleSpec(
    name="module_b",
    key_hints="J/K 切换任务，1-5 选择无人机，Enter 确认分配，R 切到推荐无人机，Esc 提前结束。",
    intro_lines=[
        "多无人机任务分配训练",
        "在任务截止前，把任务分配给最合适的无人机",
        "难度通过任务并发、规则数量、刷新速度和时间压力共同提升",
        "当前版本支持固定难度与窗级自适应"
    ],
    placeholder_events=["assignment", "rule_update", "timeout"],
)
