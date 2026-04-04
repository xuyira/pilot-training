# 模块 B PRD：多无人机任务分配训练

## 1. 目标

模块 B 面向飞行员/任务指挥角色的认知训练，不训练直接操纵，而训练以下能力：

- 资源匹配：将任务分配给能力合适的无人机
- 优先级控制：高优先级任务必须优先处理
- 规则更新：当限制条件变化时快速修正分配
- 并发切换：在多个待处理任务下维持正确决策

模块 B 与模块 A 的区别：

- 模块 A：持续监控与抑制控制
- 模块 B：动态任务分配与重规划

## 2. 核心玩法

屏幕分为三栏：

- 左栏：任务池
- 中栏：无人机面板
- 右栏：规则与态势栏

玩家目标是在任务截止前，将当前选中的任务分配给正确的无人机。

## 3. 交互

- `J` / `K`：切换当前选中的任务
- `1` - `5`：选择对应槽位的无人机
- `Enter`：确认分配
- `R`：切换到推荐无人机
- `Esc`：提前结束

## 4. 元素定义

### 4.1 任务卡

每个任务卡包含：

- `task_id`
- `task_type`：`recon` / `patrol` / `relay` / `delivery`
- `zone`：`A` / `B` / `C` / `D`
- `priority`：`critical` / `high` / `medium`
- `min_battery`
- `requires_night`
- `wind_band`：`low` / `medium` / `high`
- `deadline_ms`

### 4.2 无人机卡

每架无人机包含：

- `drone_id`
- `name`
- `supported_types`
- `zones`
- `battery`
- `night_capable`
- `wind_class`
- `busy_until`

## 5. 正确分配规则

默认硬规则：

1. 无人机必须支持对应 `task_type`
2. 无人机必须覆盖对应 `zone`
3. 当前电量必须大于等于任务 `min_battery`

可动态启用的附加规则：

- `night_gate`：夜间任务只能分配给夜航认证无人机
- `wind_gate`：强风任务只能分配给抗风等级足够的无人机
- `reserve_gate`：分配后剩余电量不得低于 20%
- `critical_best_battery`：关键任务必须选当前合格无人机中电量最高者
- `relay_bias`：中继任务必须优先选择具备中继能力的无人机

## 6. 任务生成

系统不使用手工关卡，采用“模板 + 参数 + 规则约束”生成任务。

任务模板：

- 区域侦察
- 航线巡查
- 链路中继
- 紧急投送

生成步骤：

1. 根据当前等级选取可用模板集合
2. 随机采样 `zone`、`priority`、`deadline_ms`、`min_battery`
3. 按当前启用规则注入 `requires_night`、`wind_band`
4. 校验至少存在 1 个可行解
5. 计算推荐无人机与错误类别

## 7. 事件与判分

每次任务结束时产出以下结果之一：

- `correct`
- `priority_error`
- `rule_violation`
- `suboptimal_assignment`
- `late_assignment`

同时记录：

- `task_id`
- `drone_id`
- `task_priority`
- `task_type`
- `rule_version`
- `recommended_drone_id`

## 8. 固定难度

### L1

- 2 架无人机
- 同时最多 2 个任务
- 仅启用 1 条动态规则
- 任务刷新慢
- 无人机状态基本稳定

### L2

- 3 架无人机
- 同时最多 3 个任务
- 启用 2 条动态规则
- 低频任务刷新
- 少量高优先级任务

### L3

- 4 架无人机
- 同时最多 3 个任务
- 启用 3 条动态规则
- 中频刷新
- 开始出现规则更新事件

### L4

- 4 架无人机
- 同时最多 4 个任务
- 启用 4 条动态规则
- 高频刷新
- 增加更短时限任务与更多关键任务

### L5

- 5 架无人机
- 同时最多 5 个任务
- 启用 5 条动态规则
- 高频刷新
- 明显时间压力
- 频繁规则更新

## 9. 自适应难度

每个时间窗统计：

- `assignment_accuracy`
- `priority_accuracy`
- `rule_violation_rate`
- `reallocation_success_rate`
- `mean_decision_time_ms`
- `timeout_rate`

升档条件：

- 正确率高
- 优先级错误低
- 规则违背低
- 平均决策时间合格

降档条件：

- 超时明显增多
- 关键任务错误显著
- 规则违背率过高

## 10. 第一版实现边界

第一版只实现：

- 固定 5 级难度
- 窗级自适应
- 4 类任务模板
- 5 种规则
- 单次分配闭环与结果汇总

暂不实现：

- 拖拽交互
- 多步任务链
- 历史任务重放
- 无人机维修/返航动画
