from __future__ import annotations

from src.modules.base import ModuleSpec


MODULE_A_SPEC = ModuleSpec(
    name="module_a",
    key_hints="按 Space 确认圆形红灯关键告警，忽略菱形红灯与黄灯，按 Esc 可提前结束。",
    intro_lines=[
        "持续监控与响应控制训练",
        "8 仪表沉浸式监控界面",
        "圆形红灯为关键告警，菱形红灯为伪告警，黄灯为非关键变化",
        "当前版本已接入事件日志、marker 与窗级自适应"
    ],
    placeholder_events=["target_alarm", "pseudo_alarm", "noncritical_change"],
)
