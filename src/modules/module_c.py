from __future__ import annotations

from src.modules.base import ModuleSpec


MODULE_C_SPEC = ModuleSpec(
    name="module_c",
    key_hints="左键选机，右键加路径点，Enter 执行，Space 暂停/继续，Backspace 撤销路径点，C 清空未来路径，Esc 提前结束。",
    intro_lines=[
        "多无人机网格规划分配训练",
        "在危险区与目标点混合的网格地图上，为多架无人机持续规划路径",
        "支持飞行中追加路径、暂停重规划与连续任务链",
        "当前版本提供模块 C 骨架与基础交互闭环"
    ],
    placeholder_events=["path_execute", "target_complete", "drone_crash"],
)
