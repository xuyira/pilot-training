const MODULE_A_INSTRUMENTS = [
  {id: "airspeed", title: "空速表", code: "IAS", zone: "动力/推进", lampLeft: 6.23, lampTop: 12.63, lampSize: 3.61},
  {id: "attitude", title: "姿态仪", code: "ATT", zone: "导航/航电", lampLeft: 30.0, lampTop: 12.63, lampSize: 3.61},
  {id: "altimeter", title: "高度表", code: "ALT", zone: "导航/航电", lampLeft: 53.69, lampTop: 12.63, lampSize: 3.61},
  {id: "turn", title: "转弯侧滑仪", code: "TRN", zone: "通信/链路", lampLeft: 77.38, lampTop: 12.63, lampSize: 3.61},
  {id: "heading", title: "航向仪", code: "HDG", zone: "任务载荷/系统状态", lampLeft: 6.23, lampTop: 58.44, lampSize: 3.61},
  {id: "vsi", title: "升降速度表", code: "VSI", zone: "动力/推进", lampLeft: 29.92, lampTop: 58.44, lampSize: 3.61},
  {id: "engine", title: "发动机监控", code: "ENG", zone: "动力/推进", lampLeft: 53.61, lampTop: 58.44, lampSize: 3.61},
  {id: "navcom", title: "导航通信", code: "COM", zone: "通信/链路", lampLeft: 77.38, lampTop: 58.44, lampSize: 3.61},
];

const MODULE_B_DRONE_CATALOG = [
  {id: "D1", name: "Falcon-1", types: ["recon", "patrol"], zones: ["A", "B"], battery: 88, night: false, windClass: 1},
  {id: "D2", name: "Viper-2", types: ["relay", "patrol"], zones: ["B", "C", "D"], battery: 82, night: true, windClass: 2},
  {id: "D3", name: "Atlas-3", types: ["delivery", "patrol"], zones: ["A", "C"], battery: 92, night: false, windClass: 3},
  {id: "D4", name: "Ghost-4", types: ["recon", "relay"], zones: ["C", "D"], battery: 76, night: true, windClass: 2},
  {id: "D5", name: "Titan-5", types: ["delivery", "relay"], zones: ["A", "B", "D"], battery: 95, night: true, windClass: 3},
];

const MODULE_B_RULE_LIBRARY = [
  {id: "night_gate", label: "夜航限制", detail: "夜间任务只能分配给夜航认证无人机。"},
  {id: "wind_gate", label: "抗风限制", detail: "强风任务只能分配给抗风等级 2 以上无人机。"},
  {id: "reserve_gate", label: "电量预留", detail: "分配后剩余电量不得低于 20%。"},
  {id: "critical_best_battery", label: "关键任务优先", detail: "关键任务必须使用当前合格无人机中电量最高者。"},
  {id: "relay_bias", label: "中继偏置", detail: "中继任务必须优先分配给具备中继能力的无人机。"},
];

const MODULE_B_TASK_TEMPLATES = [
  {type: "recon", label: "区域侦察", batteryRange: [24, 42]},
  {type: "patrol", label: "航线巡查", batteryRange: [28, 48]},
  {type: "relay", label: "链路中继", batteryRange: [26, 44]},
  {type: "delivery", label: "紧急投送", batteryRange: [34, 54]},
];

const state = {
  bootstrap: null,
  session: null,
  block: null,
  countdownTimer: null,
  blockTimer: null,
  blockStartedAt: null,
  finishingBlock: false,
  eventCount: 0,
  lastKey: "-",
  selectedModule: "module_a",
  selectedMode: "fixed",
  selectedLevel: "L1",
  setupForm: {
    subject_id: "",
    session_id: "",
    experimenter: "",
    duration_minutes: "5",
  },
  moduleA: null,
  moduleB: null,
};

const appRoot = document.querySelector("#app");
const serverStatus = document.querySelector("#server-status");
const versionBadge = document.querySelector("#app-version");

window.addEventListener("DOMContentLoaded", async () => {
  await loadBootstrap();
  renderSetup();
});

async function loadBootstrap() {
  const response = await fetch("/api/bootstrap");
  const data = await response.json();
  state.bootstrap = data;
  versionBadge.textContent = `v${data.app.version}`;
  serverStatus.textContent = "Backend Ready";
}

function renderSetup() {
  clearTimers();
  setImmersiveMode(false);
  state.session = null;
  state.block = null;
  state.moduleA = null;
  state.moduleB = null;
  state.eventCount = 0;
  state.lastKey = "-";
  state.finishingBlock = false;

  appRoot.innerHTML = "";
  const node = cloneTemplate("setup-template");
  const form = node.querySelector("#setup-form");
  const moduleButtons = node.querySelectorAll("[data-module]");
  const modeButtons = node.querySelectorAll("[data-mode]");
  const levelGrid = node.querySelector("#level-grid");
  const hint = node.querySelector("#setup-hint");
  const inputs = {
    subject: form.querySelector('input[name="subject_id"]'),
    session: form.querySelector('input[name="session_id"]'),
    experimenter: form.querySelector('input[name="experimenter"]'),
    duration: form.querySelector('input[name="duration_minutes"]'),
  };

  inputs.subject.value = state.setupForm.subject_id;
  inputs.session.value = state.setupForm.session_id;
  inputs.experimenter.value = state.setupForm.experimenter;
  inputs.duration.value = state.setupForm.duration_minutes;

  inputs.subject.addEventListener("input", (event) => {
    state.setupForm.subject_id = event.target.value;
  });
  inputs.session.addEventListener("input", (event) => {
    state.setupForm.session_id = event.target.value;
  });
  inputs.experimenter.addEventListener("input", (event) => {
    state.setupForm.experimenter = event.target.value;
  });
  inputs.duration.addEventListener("input", (event) => {
    state.setupForm.duration_minutes = event.target.value;
  });

  state.bootstrap.levels.forEach((level) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-chip${state.selectedLevel === level ? " is-active" : ""}`;
    button.textContent = level;
    button.addEventListener("click", () => {
      state.selectedLevel = level;
      renderSetup();
    });
    levelGrid.appendChild(button);
  });

  moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.module === state.selectedModule);
    button.addEventListener("click", () => {
      state.selectedModule = button.dataset.module;
      hint.textContent = "";
      renderSetup();
    });
  });

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.selectedMode);
    button.addEventListener("click", () => {
      state.selectedMode = button.dataset.mode;
      renderSetup();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      ...state.setupForm,
      module_name: state.selectedModule,
      mode: state.selectedMode,
      start_level: state.selectedLevel,
    };
    const response = await fetch("/api/session/start", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });
    state.session = await response.json();
    await runCountdown();
  });

  appRoot.appendChild(node);
}

async function runCountdown() {
  clearTimers();
  setImmersiveMode(true);
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  appRoot.innerHTML = "";
  const node = cloneTemplate("countdown-template");
  node.classList.toggle("countdown-minimal", state.selectedModule === "module_a");
  node.querySelector("#countdown-module-title").textContent = "";
  node.querySelector("#countdown-mode-line").textContent = "";
  const numberNode = node.querySelector("#countdown-number");
  appRoot.appendChild(node);

  let remaining = state.bootstrap.ui.countdown_seconds;
  numberNode.textContent = String(remaining);

  state.countdownTimer = window.setInterval(async () => {
    remaining -= 1;
    if (remaining <= 0) {
      clearTimers();
      numberNode.textContent = "";
      await startBlock();
      return;
    }
    numberNode.textContent = String(remaining);
  }, 1000);
}

async function startBlock() {
  const response = await fetch(`/api/session/${state.session.sessionToken}/block/start`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: "{}",
  });
  state.block = await response.json();
  state.blockStartedAt = performance.now();
  state.eventCount = 0;
  state.lastKey = "-";
  renderBlock();
}

function renderBlock() {
  clearTimers();
  setImmersiveMode(true);
  appRoot.innerHTML = "";
  const node = cloneTemplate("block-template");
  const moduleMeta = state.bootstrap.modules[state.block.moduleName];
  node.classList.toggle("module-a-fullscreen", state.block.moduleName === "module_a");
  node.querySelector("#block-module-title").textContent = moduleMeta.label;
  node.querySelector("#block-module-desc").textContent = "";
  node.querySelector("#block-level").textContent = state.block.level;
  node.querySelector("#block-id").textContent = `#${state.block.blockId}`;
  node.querySelector("#key-hints").textContent = state.block.moduleSpec.keyHints;
  node.querySelector("#block-rule-line").textContent = state.block.moduleName === "module_a"
    ? ""
    : moduleMeta.description;
  node.querySelector("#session-dir").textContent = compactPath(state.session.sessionDir);
  node.querySelector("#level-config").textContent = JSON.stringify(state.block.levelConfig, null, 2);
  appRoot.appendChild(node);

  if (state.block.moduleName === "module_a") {
    initializeModuleA(node);
  } else {
    initializeModuleB(node);
  }

  window.addEventListener("keydown", handleBlockKeydown);
  const timerNode = node.querySelector("#block-timer");
  state.blockTimer = window.setInterval(async () => {
    const elapsedSeconds = Math.floor((performance.now() - state.blockStartedAt) / 1000);
    const remaining = Math.max(0, state.block.durationSeconds - elapsedSeconds);
    timerNode.textContent = `${remaining}s`;
    if (state.moduleA) {
      tickModuleAAdaptiveWindow();
    }
    if (state.moduleB) {
      tickModuleB();
      tickModuleBAdaptiveWindow();
    }
    if (remaining <= 0) {
      await finishBlock();
    }
  }, 200);
}

function initializeModuleA(node) {
  const level = state.block.level;
  const levelConfig = getModuleALevelConfig(level);
  state.moduleA = {
    sceneNode: node.querySelector("#module-scene"),
    levelNode: node.querySelector("#block-level"),
    ruleNode: node.querySelector("#block-rule-line"),
    currentLevel: level,
    currentLevelConfig: levelConfig,
    activeInstrumentIds: getActiveInstrumentIds(levelConfig.active_zones),
    activeEvent: null,
    nextEventTimeout: null,
    activeEventTimeout: null,
    lastWindowIndex: 0,
    promoteStreak: 0,
    demoteStreak: 0,
    lastAdaptAction: "hold",
    windows: [],
    currentWindow: createWindowMetrics(1, level),
    pendingWindowFinalize: false,
    isFinalizingWindow: false,
    blockEndingPending: false,
    anchorNodes: new Map(),
    lampNodes: new Map(),
  };
  renderModuleAScene();
  scheduleNextModuleAEvent();
}

function initializeModuleB(node) {
  const level = state.block.level;
  const levelConfig = getModuleBLevelConfig(level);
  const drones = buildModuleBDrones(levelConfig.drone_count);
  const activeRules = pickModuleBRules(levelConfig.rule_count);
  state.moduleB = {
    sceneNode: node.querySelector("#module-scene"),
    levelNode: node.querySelector("#block-level"),
    ruleNode: node.querySelector("#block-rule-line"),
    currentLevel: level,
    currentLevelConfig: levelConfig,
    drones,
    tasks: [],
    selectedTaskIndex: 0,
    selectedDroneId: drones[0]?.id ?? "",
    nextTaskId: 1,
    nextSpawnTimeout: null,
    nextRuleUpdateTimeout: null,
    processingTimeouts: false,
    promoteStreak: 0,
    demoteStreak: 0,
    lastAdaptAction: "hold",
    activeRules,
    ruleVersion: 1,
    lastWindowIndex: 0,
    isFinalizingWindow: false,
    currentWindow: createModuleBWindowMetrics(1, level),
    windows: [],
  };
  syncModuleBRuleLine();
  ensureModuleBQueueFilled(state.moduleB, Math.min(2, levelConfig.task_queue_size));
  scheduleNextModuleBSpawn();
  scheduleNextModuleBRuleUpdate();
  renderModuleBScene();
}

function renderModuleAScene() {
  const runtime = state.moduleA;
  if (!runtime) {
    return;
  }
  if (runtime.anchorNodes.size > 0) {
    updateModuleAScene();
    return;
  }
  const activeIds = new Set(runtime.activeInstrumentIds);
  runtime.sceneNode.innerHTML = "";
  runtime.sceneNode.className = "module-scene cockpit-scene";

  const panel = document.createElement("div");
  panel.className = "cockpit-image-panel";
  panel.innerHTML = `<img src="/assets/module-a-background.png" alt="模块 A 仪表盘底图" class="cockpit-background-image" />`;

  const lampLayer = document.createElement("div");
  lampLayer.className = "cockpit-lamp-layer";
  MODULE_A_INSTRUMENTS.forEach((instrument) => {
    const event = runtime.activeEvent?.instrumentId === instrument.id ? runtime.activeEvent : null;
    const lampClass = event ? lampClassForEvent(event.type) : "lamp-off";
    const lamp = document.createElement("div");
    lamp.className = `image-lamp-anchor ${activeIds.has(instrument.id) ? "is-active-zone" : "is-inactive-zone"}`;
    lamp.style.left = `${instrument.lampLeft}%`;
    lamp.style.top = `${instrument.lampTop}%`;
    lamp.style.setProperty("--lamp-size", `${instrument.lampSize ?? 3.61}%`);
    lamp.innerHTML = `
      <div class="instrument-lamp ${lampClass}">
        <span class="lamp-dot"></span>
      </div>
    `;
    runtime.anchorNodes.set(instrument.id, lamp);
    runtime.lampNodes.set(instrument.id, lamp.querySelector(".instrument-lamp"));
    lampLayer.appendChild(lamp);
  });
  panel.appendChild(lampLayer);
  runtime.sceneNode.appendChild(panel);
  runtime.levelNode.textContent = runtime.currentLevel;
}

function updateModuleAScene() {
  const runtime = state.moduleA;
  if (!runtime) {
    return;
  }
  const activeIds = new Set(runtime.activeInstrumentIds);
  MODULE_A_INSTRUMENTS.forEach((instrument) => {
    const anchor = runtime.anchorNodes.get(instrument.id);
    const lamp = runtime.lampNodes.get(instrument.id);
    if (!anchor || !lamp) {
      return;
    }
    const event = runtime.activeEvent?.instrumentId === instrument.id ? runtime.activeEvent : null;
    anchor.classList.toggle("is-active-zone", activeIds.has(instrument.id));
    anchor.classList.toggle("is-inactive-zone", !activeIds.has(instrument.id));
    lamp.className = `instrument-lamp ${event ? lampClassForEvent(event.type) : "lamp-off"}`;
  });
  runtime.levelNode.textContent = runtime.currentLevel;
}

function renderModuleBScene() {
  const runtime = state.moduleB;
  if (!runtime) {
    return;
  }
  runtime.sceneNode.className = "module-scene module-b-scene";
  runtime.levelNode.textContent = runtime.currentLevel;
  syncModuleBRuleLine();
  const now = performance.now();
  const selectedTask = runtime.tasks[runtime.selectedTaskIndex] ?? null;
  const selectedDroneId = runtime.selectedDroneId || runtime.drones[0]?.id || "";
  const taskMarkup = runtime.tasks.length
    ? runtime.tasks.map((task, index) => {
      const recommendation = getModuleBRecommendation(runtime, task, now);
      const remainingMs = Math.max(0, task.deadlineAt - now);
      const isSelected = index === runtime.selectedTaskIndex;
      return `
        <article class="task-card${isSelected ? " is-selected" : ""}">
          <div class="task-topline">
            <span class="task-priority ${priorityClass(task.priority)}">${formatTaskPriority(task.priority)}</span>
            <span class="task-deadline">${Math.ceil(remainingMs / 1000)}s</span>
          </div>
          <h3>${task.label}</h3>
          <p>${task.id} · ${task.zone} 区 · 最低电量 ${task.minBattery}%</p>
          <div class="task-tags">
            <span>${formatTaskType(task.type)}</span>
            <span>${task.requiresNight ? "夜间" : "昼间"}</span>
            <span>${formatWindBand(task.windBand)}</span>
          </div>
          <div class="task-recommendation">
            <span>推荐</span>
            <strong>${recommendation?.drone?.name ?? "无可行机"}</strong>
          </div>
        </article>
      `;
    }).join("")
    : `<div class="module-b-empty">任务池清空，等待新任务。</div>`;

  const droneMarkup = runtime.drones.map((drone, index) => {
    const busy = drone.busyUntil > now;
    const isSelected = selectedDroneId === drone.id;
    const recommendationMatch = selectedTask ? getModuleBRecommendation(runtime, selectedTask, now)?.drone?.id === drone.id : false;
    return `
      <article class="drone-card${isSelected ? " is-selected" : ""}${recommendationMatch ? " is-recommended" : ""}">
        <div class="drone-card-top">
          <div>
            <span class="drone-slot">${index + 1}</span>
            <h3>${drone.name}</h3>
          </div>
          <span class="drone-state ${busy ? "is-busy" : "is-ready"}">${busy ? "忙碌" : "待命"}</span>
        </div>
        <p>${drone.id} · 区域 ${drone.zones.join("/")}</p>
        <div class="battery-row">
          <span>电量</span>
          <strong>${Math.max(0, Math.round(drone.battery))}%</strong>
        </div>
        <div class="battery-bar"><span style="width:${Math.max(6, Math.round(drone.battery))}%"></span></div>
        <div class="task-tags">
          ${drone.types.map((type) => `<span>${formatTaskType(type)}</span>`).join("")}
          <span>${drone.night ? "夜航" : "昼航"}</span>
          <span>抗风 ${drone.windClass}</span>
        </div>
      </article>
    `;
  }).join("");

  const ruleMarkup = runtime.activeRules.map((rule) => `
    <article class="rule-card">
      <span>规则 ${runtime.ruleVersion}</span>
      <strong>${rule.label}</strong>
      <p>${rule.detail}</p>
    </article>
  `).join("");

  runtime.sceneNode.innerHTML = `
    <section class="module-b-column">
      <div class="module-b-panel">
        <div class="module-b-panel-head">
          <div>
            <p class="section-label">任务池</p>
            <h2>待分配任务</h2>
          </div>
          <strong>${runtime.tasks.length}/${runtime.currentLevelConfig.task_queue_size}</strong>
        </div>
        <div class="task-list">${taskMarkup}</div>
      </div>
    </section>
    <section class="module-b-column">
      <div class="module-b-panel">
        <div class="module-b-panel-head">
          <div>
            <p class="section-label">无人机</p>
            <h2>资源面板</h2>
          </div>
          <strong>${runtime.drones.length} 架</strong>
        </div>
        <div class="drone-list">${droneMarkup}</div>
      </div>
    </section>
    <section class="module-b-column">
      <div class="module-b-panel">
        <div class="module-b-panel-head">
          <div>
            <p class="section-label">规则与节奏</p>
            <h2>当前态势</h2>
          </div>
          <strong>${state.selectedMode === "adaptive" ? "自适应" : "固定"}</strong>
        </div>
        <div class="rule-list">${ruleMarkup}</div>
        <div class="module-b-brief">
          <div>
            <span>已处理</span>
            <strong>${runtime.currentWindow.assignments}</strong>
          </div>
          <div>
            <span>超时</span>
            <strong>${runtime.currentWindow.timeouts}</strong>
          </div>
          <div>
            <span>正确</span>
            <strong>${runtime.currentWindow.correct}</strong>
          </div>
          <div>
            <span>选中任务</span>
            <strong>${selectedTask?.id ?? "-"}</strong>
          </div>
        </div>
      </div>
    </section>
  `;
}

async function handleBlockKeydown(event) {
  if (!state.block || event.repeat) {
    return;
  }
  if (event.key === "Escape") {
    await finishBlock();
    return;
  }

  if (state.block.moduleName === "module_a") {
    await handleModuleAKeydown(event);
    return;
  }

  await handleModuleBKeydown(event);
}

async function handleModuleAKeydown(event) {
  if (event.code !== "Space") {
    return;
  }
  event.preventDefault();
  const runtime = state.moduleA;
  if (!runtime) {
    return;
  }
  state.lastKey = "Space";
  const activeEvent = runtime.activeEvent;
  const reactionTime = activeEvent ? Math.round(performance.now() - activeEvent.startedAt) : "";

  if (activeEvent && activeEvent.type === "target_alarm") {
    clearActiveEventTimeouts();
    runtime.currentWindow.hits += 1;
    runtime.currentWindow.reactionTimes.push(reactionTime);
    await postBlockEvent({
      event_type: "response",
      event_subtype: "target_correct",
      marker_event_name: "A_correct",
      difficulty_level: runtime.currentLevel,
      zone_or_task_area: activeEvent.zone,
      expected_action: "space",
      actual_action: "space",
      correctness: "correct",
      reaction_time_ms: reactionTime,
    });
    await clearModuleAEvent();
    await continueModuleAAfterEvent();
    updateBlockStats();
    return;
  }

  if (activeEvent && activeEvent.type !== "target_alarm" && activeEvent.falseAlarmLogged) {
    updateBlockStats();
    return;
  }

  if (activeEvent && activeEvent.type !== "target_alarm") {
    activeEvent.falseAlarmLogged = true;
  }

  runtime.currentWindow.falseAlarms += 1;
  if (!activeEvent) {
    runtime.currentWindow.idleFalseAlarms += 1;
  }
  await postBlockEvent({
    event_type: "response",
    event_subtype: activeEvent ? "false_alarm" : "idle_false_alarm",
    marker_event_name: "A_false_alarm",
    difficulty_level: runtime.currentLevel,
    zone_or_task_area: activeEvent?.zone || "none",
    expected_action: activeEvent?.type === "target_alarm" ? "space" : "none",
    actual_action: "space",
    correctness: "false_alarm",
    reaction_time_ms: reactionTime,
  });
  updateBlockStats();
}

async function handleModuleBKeydown(event) {
  const runtime = state.moduleB;
  if (!runtime) {
    return;
  }

  if (event.key === "j" || event.key === "J") {
    event.preventDefault();
    if (runtime.tasks.length) {
      runtime.selectedTaskIndex = (runtime.selectedTaskIndex - 1 + runtime.tasks.length) % runtime.tasks.length;
      renderModuleBScene();
    }
    return;
  }

  if (event.key === "k" || event.key === "K") {
    event.preventDefault();
    if (runtime.tasks.length) {
      runtime.selectedTaskIndex = (runtime.selectedTaskIndex + 1) % runtime.tasks.length;
      renderModuleBScene();
    }
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    const task = runtime.tasks[runtime.selectedTaskIndex];
    const recommendation = task ? getModuleBRecommendation(runtime, task, performance.now()) : null;
    if (recommendation?.drone?.id) {
      runtime.selectedDroneId = recommendation.drone.id;
      renderModuleBScene();
    }
    return;
  }

  if (/^[1-5]$/.test(event.key)) {
    const drone = runtime.drones[Number(event.key) - 1];
    if (drone) {
      runtime.selectedDroneId = drone.id;
      renderModuleBScene();
    }
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    await assignSelectedModuleBTask();
  }
}

async function assignSelectedModuleBTask() {
  const runtime = state.moduleB;
  if (!runtime || !runtime.tasks.length) {
    return;
  }
  const now = performance.now();
  const task = runtime.tasks[runtime.selectedTaskIndex];
  const drone = runtime.drones.find((item) => item.id === runtime.selectedDroneId) ?? runtime.drones[0];
  if (!task || !drone) {
    return;
  }

  const recommendation = getModuleBRecommendation(runtime, task, now);
  const result = evaluateModuleBAssignment(runtime, task, drone, recommendation, now);
  const reactionTime = Math.round(now - task.createdAt);

  runtime.currentWindow.assignments += 1;
  runtime.currentWindow.decisionTimes.push(reactionTime);
  if (task.priority === "critical") {
    runtime.currentWindow.criticalAssignments += 1;
  }
  if (result.correctness === "correct") {
    runtime.currentWindow.correct += 1;
    if (task.priority === "critical") {
      runtime.currentWindow.criticalCorrect += 1;
    }
  }
  if (result.correctness === "priority_error") {
    runtime.currentWindow.priorityErrors += 1;
  }
  if (result.correctness === "rule_violation") {
    runtime.currentWindow.ruleViolations += 1;
  }
  if (result.correctness === "suboptimal_assignment") {
    runtime.currentWindow.suboptimal += 1;
  }

  consumeDroneAfterAssignment(drone, task, now);

  await postBlockEvent({
    event_type: "response",
    event_subtype: "task_assignment",
    marker_event_name: markerForModuleBOutcome(result.correctness),
    difficulty_level: runtime.currentLevel,
    zone_or_task_area: task.zone,
    expected_action: recommendation?.drone?.id ?? "",
    actual_action: drone.id,
    correctness: result.correctness,
    reaction_time_ms: reactionTime,
    task_id: task.id,
    drone_id: drone.id,
    recommended_drone_id: recommendation?.drone?.id ?? "",
    task_priority: task.priority,
    task_type: task.type,
    rule_version: runtime.ruleVersion,
    queue_size: runtime.tasks.length,
  });

  removeModuleBTask(task.id);
  applyModuleBStatusShift(runtime);
  ensureModuleBQueueFilled(runtime, 1);
  renderModuleBScene();
  updateBlockStats();
}

function scheduleNextModuleAEvent() {
  const runtime = state.moduleA;
  if (!runtime || runtime.activeEvent || runtime.blockEndingPending || state.finishingBlock) {
    return;
  }
  if (runtime.nextEventTimeout) {
    window.clearTimeout(runtime.nextEventTimeout);
  }
  const delay = randomBetween(...runtime.currentLevelConfig.event_interval_ms);
  runtime.nextEventTimeout = window.setTimeout(() => {
    runtime.nextEventTimeout = null;
    triggerModuleAEvent();
  }, delay);
}

async function triggerModuleAEvent() {
  const runtime = state.moduleA;
  if (!runtime || runtime.activeEvent || runtime.blockEndingPending || state.finishingBlock) {
    return;
  }
  const type = pickModuleAEventType(runtime.currentLevelConfig);
  const instrumentId = pickRandom(runtime.activeInstrumentIds);
  const instrument = MODULE_A_INSTRUMENTS.find((item) => item.id === instrumentId);
  if (!instrument) {
    return;
  }
  const startedAt = performance.now();
  const event = {
    id: `${instrumentId}-${startedAt}`,
    type,
    instrumentId,
    zone: instrument.zone,
    startedAt,
    falseAlarmLogged: false,
  };
  runtime.activeEvent = event;

  if (type === "target_alarm") {
    runtime.currentWindow.targets += 1;
    runtime.activeEventTimeout = window.setTimeout(() => {
      void handleModuleATargetMiss();
    }, runtime.currentLevelConfig.response_window_ms);
  } else {
    runtime.currentWindow.nonTargets += 1;
    runtime.activeEventTimeout = window.setTimeout(async () => {
      await clearModuleAEvent();
      await continueModuleAAfterEvent();
    }, runtime.currentLevelConfig.lamp_duration_ms);
  }

  renderModuleAScene();
  await postBlockEvent({
    event_type: "stimulus",
    event_subtype: type === "target_alarm" ? "target_alarm_onset" : type === "pseudo_alarm" ? "pseudo_alarm_onset" : "noncritical_onset",
    marker_event_name: type === "target_alarm" ? "A_target_alarm" : type === "pseudo_alarm" ? "A_pseudo_alarm" : "A_noncritical",
    difficulty_level: runtime.currentLevel,
    zone_or_task_area: instrument.zone,
    expected_action: type === "target_alarm" ? "space" : "none",
    actual_action: "",
    correctness: "pending",
  });
  updateBlockStats();
}

async function handleModuleATargetMiss() {
  const runtime = state.moduleA;
  const activeEvent = runtime?.activeEvent;
  if (!runtime || !activeEvent || activeEvent.type !== "target_alarm") {
    return;
  }
  runtime.currentWindow.misses += 1;
  clearActiveEventTimeouts();
  await postBlockEvent({
    event_type: "outcome",
    event_subtype: "target_miss",
    marker_event_name: "A_miss",
    difficulty_level: runtime.currentLevel,
    zone_or_task_area: activeEvent.zone,
    expected_action: "space",
    actual_action: "",
    correctness: "miss",
    reaction_time_ms: "",
  });
  await clearModuleAEvent();
  await continueModuleAAfterEvent();
  updateBlockStats();
}

async function clearModuleAEvent() {
  clearActiveEventTimeouts();
  if (state.moduleA) {
    state.moduleA.activeEvent = null;
    if (state.moduleA.pendingWindowFinalize && !state.moduleA.isFinalizingWindow) {
      state.moduleA.pendingWindowFinalize = false;
      await finalizeModuleAWindow();
    }
    renderModuleAScene();
  }
}

async function continueModuleAAfterEvent() {
  const runtime = state.moduleA;
  if (!runtime) {
    return;
  }
  if (runtime.blockEndingPending) {
    await finishBlock();
    return;
  }
  scheduleNextModuleAEvent();
}

function clearActiveEventTimeouts() {
  if (!state.moduleA) {
    return;
  }
  if (state.moduleA.activeEventTimeout) {
    window.clearTimeout(state.moduleA.activeEventTimeout);
    state.moduleA.activeEventTimeout = null;
  }
}

function tickModuleAAdaptiveWindow() {
  const runtime = state.moduleA;
  if (!runtime || state.selectedMode !== "adaptive" || runtime.isFinalizingWindow) {
    return;
  }
  const elapsedSeconds = Math.floor((performance.now() - state.blockStartedAt) / 1000);
  const nextBoundarySeconds = (runtime.lastWindowIndex + 1) * runtime.currentLevelConfig.window_seconds;
  if (elapsedSeconds < nextBoundarySeconds || elapsedSeconds === 0) {
    return;
  }
  if (runtime.activeEvent) {
    runtime.pendingWindowFinalize = true;
    return;
  }
  runtime.pendingWindowFinalize = false;
  void finalizeModuleAWindow();
}

async function finalizeModuleAWindow(force = false) {
  const runtime = state.moduleA;
  if (!runtime || runtime.isFinalizingWindow) {
    return;
  }
  runtime.isFinalizingWindow = true;
  try {
    const targets = runtime.currentWindow.targets;
    const nonTargets = runtime.currentWindow.nonTargets;
    const hits = runtime.currentWindow.hits;
    const misses = runtime.currentWindow.misses;
    const falseAlarms = runtime.currentWindow.falseAlarms;
    const idleFalseAlarms = runtime.currentWindow.idleFalseAlarms;
    const hitRate = targets ? hits / targets : 1;
    const missRate = targets ? misses / targets : 0;
    const falseAlarmRate = nonTargets ? falseAlarms / nonTargets : falseAlarms > 0 ? 1 : 0;
    const meanRt = runtime.currentWindow.reactionTimes.length
      ? average(runtime.currentWindow.reactionTimes)
      : null;

    let adaptAction = "hold";
    let nextLevel = runtime.currentLevel;
    if (state.selectedMode === "adaptive") {
      const moduleThresholds = {
        hitMin: state.bootstrap.adaptive.module_a.hit_rate_min,
        falseMax: state.bootstrap.adaptive.module_a.false_alarm_rate_max,
        missMax: state.bootstrap.adaptive.module_a.miss_rate_max,
        meanRtMax: state.bootstrap.adaptive.module_a.mean_rt_ms_max,
        promoteStreakRequired: state.bootstrap.adaptive.module_a.promote_streak_required,
        demoteStreakRequired: state.bootstrap.adaptive.module_a.demote_streak_required ?? state.bootstrap.adaptive.module_a.promote_streak_required,
      };
      const goodWindow = targets > 0
        && hitRate >= moduleThresholds.hitMin
        && falseAlarmRate <= moduleThresholds.falseMax
        && missRate <= moduleThresholds.missMax
        && (meanRt === null || meanRt <= moduleThresholds.meanRtMax)
        && idleFalseAlarms === 0;
      const poorWindow = missRate > moduleThresholds.missMax
        || falseAlarmRate > moduleThresholds.falseMax
        || idleFalseAlarms > 0
        || (meanRt !== null && meanRt > moduleThresholds.meanRtMax * 1.1);

      if (goodWindow) {
        runtime.promoteStreak += 1;
        runtime.demoteStreak = 0;
        if (runtime.promoteStreak >= moduleThresholds.promoteStreakRequired) {
          nextLevel = shiftLevel(runtime.currentLevel, 1);
          adaptAction = nextLevel === runtime.currentLevel ? "hold" : "up";
          runtime.promoteStreak = adaptAction === "up" ? 0 : runtime.promoteStreak;
        }
      } else if (poorWindow) {
        runtime.promoteStreak = 0;
        runtime.demoteStreak += 1;
        if (runtime.demoteStreak >= moduleThresholds.demoteStreakRequired) {
          nextLevel = shiftLevel(runtime.currentLevel, -1);
          adaptAction = nextLevel === runtime.currentLevel ? "hold" : "down";
          runtime.demoteStreak = adaptAction === "down" ? 0 : runtime.demoteStreak;
        }
      } else {
        runtime.promoteStreak = 0;
        runtime.demoteStreak = 0;
      }
    }

    runtime.windows.push({
      index: runtime.currentWindow.index,
      level: runtime.currentLevel,
      targetCount: targets,
      nonTargetCount: nonTargets,
      hitRate,
      missRate,
      falseAlarmRate,
      meanRt,
      idleFalseAlarmCount: idleFalseAlarms,
      adaptAction,
    });

    await postBlockEvent({
      event_type: "adaptive",
      event_subtype: "adaptive_window",
      marker_event_name: state.selectedMode === "adaptive" ? `adapt_${adaptAction}` : "",
      difficulty_level: nextLevel,
      zone_or_task_area: "",
      expected_action: "",
      actual_action: "",
      correctness: "window",
      reaction_time_ms: meanRt ? Math.round(meanRt) : "",
      adapt_action: state.selectedMode === "adaptive" ? adaptAction : "none",
      adapt_dimension: "attention",
      window_index: runtime.currentWindow.index,
      window_target_count: targets,
      window_nontarget_count: nonTargets,
      window_hit_rate: roundTo(hitRate, 3),
      window_miss_rate: roundTo(missRate, 3),
      window_false_alarm_rate: roundTo(falseAlarmRate, 3),
      window_mean_rt_ms: meanRt ? Math.round(meanRt) : "",
      window_idle_false_alarm_count: idleFalseAlarms,
    });

    if (state.selectedMode === "adaptive" && nextLevel !== runtime.currentLevel) {
      runtime.currentLevel = nextLevel;
      runtime.currentLevelConfig = getModuleALevelConfig(nextLevel);
      runtime.activeInstrumentIds = getActiveInstrumentIds(runtime.currentLevelConfig.active_zones);
      runtime.lastAdaptAction = adaptAction;
      await postBlockEvent({
        event_type: "system",
        event_subtype: "difficulty_shift",
        marker_event_name: "difficulty_level",
        difficulty_level: nextLevel,
        zone_or_task_area: "",
        expected_action: "",
        actual_action: nextLevel,
        correctness: "updated",
        reaction_time_ms: "",
        adapt_action: adaptAction,
        adapt_dimension: "attention",
      });
      renderModuleAScene();
    }

    if (!force) {
      runtime.lastWindowIndex = runtime.currentWindow.index;
      runtime.currentWindow = createWindowMetrics(runtime.currentWindow.index + 1, runtime.currentLevel);
    }
  } finally {
    runtime.isFinalizingWindow = false;
  }
}

function tickModuleB() {
  const runtime = state.moduleB;
  if (!runtime) {
    return;
  }
  void processModuleBTimeouts();
  renderModuleBScene();
}

async function processModuleBTimeouts() {
  const runtime = state.moduleB;
  if (!runtime || runtime.processingTimeouts) {
    return;
  }
  runtime.processingTimeouts = true;
  try {
    const now = performance.now();
    const expiredTasks = runtime.tasks.filter((task) => task.deadlineAt <= now);
    for (const task of expiredTasks) {
      runtime.currentWindow.timeouts += 1;
      await postBlockEvent({
        event_type: "outcome",
        event_subtype: "task_timeout",
        marker_event_name: "B_timeout",
        difficulty_level: runtime.currentLevel,
        zone_or_task_area: task.zone,
        expected_action: getModuleBRecommendation(runtime, task, now)?.drone?.id ?? "",
        actual_action: "",
        correctness: "late_assignment",
        reaction_time_ms: "",
        task_id: task.id,
        drone_id: "",
        recommended_drone_id: getModuleBRecommendation(runtime, task, now)?.drone?.id ?? "",
        task_priority: task.priority,
        task_type: task.type,
        rule_version: runtime.ruleVersion,
        queue_size: runtime.tasks.length,
      });
      removeModuleBTask(task.id);
    }
    if (expiredTasks.length) {
      ensureModuleBQueueFilled(runtime, 1);
      updateBlockStats();
    }
  } finally {
    runtime.processingTimeouts = false;
  }
}

function tickModuleBAdaptiveWindow() {
  const runtime = state.moduleB;
  if (!runtime || state.selectedMode !== "adaptive") {
    return;
  }
  const elapsedSeconds = Math.floor((performance.now() - state.blockStartedAt) / 1000);
  const nextBoundarySeconds = (runtime.lastWindowIndex + 1) * state.bootstrap.adaptive.module_b.window_seconds;
  if (elapsedSeconds < nextBoundarySeconds || elapsedSeconds === 0) {
    return;
  }
  void finalizeModuleBWindow();
}

async function finalizeModuleBWindow(force = false) {
  const runtime = state.moduleB;
  if (!runtime || runtime.isFinalizingWindow) {
    return;
  }
  runtime.isFinalizingWindow = true;
  try {
    const assignments = runtime.currentWindow.assignments;
    const criticalAssignments = runtime.currentWindow.criticalAssignments;
    const assignmentAccuracy = assignments ? runtime.currentWindow.correct / assignments : 1;
    const priorityAccuracy = criticalAssignments ? runtime.currentWindow.criticalCorrect / criticalAssignments : 1;
    const ruleViolationRate = assignments ? runtime.currentWindow.ruleViolations / assignments : 0;
    const timeoutRate = (assignments + runtime.currentWindow.timeouts)
      ? runtime.currentWindow.timeouts / (assignments + runtime.currentWindow.timeouts)
      : 0;
    const meanDecision = runtime.currentWindow.decisionTimes.length
      ? average(runtime.currentWindow.decisionTimes)
      : null;

    let adaptAction = "hold";
    let nextLevel = runtime.currentLevel;
    if (state.selectedMode === "adaptive") {
      const thresholds = state.bootstrap.adaptive.module_b;
      const goodWindow = assignments > 0
        && assignmentAccuracy >= thresholds.assignment_accuracy_min
        && priorityAccuracy >= thresholds.priority_accuracy_min
        && ruleViolationRate <= thresholds.rule_violation_rate_max
        && timeoutRate <= thresholds.timeout_rate_max
        && (meanDecision === null || meanDecision <= thresholds.mean_decision_time_ms_max);
      const poorWindow = ruleViolationRate > thresholds.rule_violation_rate_max
        || timeoutRate > thresholds.timeout_rate_max
        || priorityAccuracy < thresholds.priority_accuracy_min * 0.9
        || (meanDecision !== null && meanDecision > thresholds.mean_decision_time_ms_max * 1.1);

      if (goodWindow) {
        runtime.promoteStreak += 1;
        runtime.demoteStreak = 0;
        if (runtime.promoteStreak >= thresholds.promote_streak_required) {
          nextLevel = shiftLevel(runtime.currentLevel, 1);
          adaptAction = nextLevel === runtime.currentLevel ? "hold" : "up";
          runtime.promoteStreak = adaptAction === "up" ? 0 : runtime.promoteStreak;
        }
      } else if (poorWindow) {
        runtime.promoteStreak = 0;
        runtime.demoteStreak += 1;
        if (runtime.demoteStreak >= thresholds.demote_streak_required) {
          nextLevel = shiftLevel(runtime.currentLevel, -1);
          adaptAction = nextLevel === runtime.currentLevel ? "hold" : "down";
          runtime.demoteStreak = adaptAction === "down" ? 0 : runtime.demoteStreak;
        }
      } else {
        runtime.promoteStreak = 0;
        runtime.demoteStreak = 0;
      }
    }

    runtime.windows.push({
      index: runtime.currentWindow.index,
      level: runtime.currentLevel,
      assignmentAccuracy,
      priorityAccuracy,
      ruleViolationRate,
      timeoutRate,
      meanDecision,
      adaptAction,
    });

    await postBlockEvent({
      event_type: "adaptive",
      event_subtype: "adaptive_window",
      marker_event_name: state.selectedMode === "adaptive" ? `adapt_${adaptAction}` : "",
      difficulty_level: nextLevel,
      zone_or_task_area: "",
      expected_action: "",
      actual_action: "",
      correctness: "window",
      reaction_time_ms: meanDecision ? Math.round(meanDecision) : "",
      adapt_action: state.selectedMode === "adaptive" ? adaptAction : "none",
      adapt_dimension: "priority",
      assignment_accuracy: roundTo(assignmentAccuracy, 3),
      priority_accuracy: roundTo(priorityAccuracy, 3),
      rule_violation_rate: roundTo(ruleViolationRate, 3),
      timeout_rate: roundTo(timeoutRate, 3),
      timeout_count: runtime.currentWindow.timeouts,
      window_assignment_count: assignments,
      window_mean_rt_ms: meanDecision ? Math.round(meanDecision) : "",
    });

    if (state.selectedMode === "adaptive" && nextLevel !== runtime.currentLevel) {
      runtime.currentLevel = nextLevel;
      runtime.currentLevelConfig = getModuleBLevelConfig(nextLevel);
      syncModuleBDrones(runtime, runtime.currentLevelConfig.drone_count);
      runtime.activeRules = pickModuleBRules(runtime.currentLevelConfig.rule_count, runtime.activeRules.map((rule) => rule.id));
      runtime.ruleVersion += 1;
      runtime.lastAdaptAction = adaptAction;
      await postBlockEvent({
        event_type: "system",
        event_subtype: "difficulty_shift",
        marker_event_name: "difficulty_level",
        difficulty_level: nextLevel,
        zone_or_task_area: "",
        expected_action: "",
        actual_action: nextLevel,
        correctness: "updated",
        reaction_time_ms: "",
        adapt_action: adaptAction,
        adapt_dimension: "priority",
        rule_version: runtime.ruleVersion,
      });
    }

    if (!force) {
      runtime.lastWindowIndex = runtime.currentWindow.index;
      runtime.currentWindow = createModuleBWindowMetrics(runtime.currentWindow.index + 1, runtime.currentLevel);
    }
  } finally {
    runtime.isFinalizingWindow = false;
  }
}

function ensureModuleBQueueFilled(runtime, minimumCount) {
  while (runtime.tasks.length < Math.min(minimumCount, runtime.currentLevelConfig.task_queue_size)) {
    const task = createModuleBTask(runtime);
    if (!task) {
      break;
    }
    runtime.tasks.push(task);
  }
}

function scheduleNextModuleBSpawn() {
  const runtime = state.moduleB;
  if (!runtime || runtime.nextSpawnTimeout || state.finishingBlock) {
    return;
  }
  const [minDelay, maxDelay] = runtime.currentLevelConfig.task_spawn_interval_ms;
  const delay = randomBetween(minDelay, maxDelay);
  runtime.nextSpawnTimeout = window.setTimeout(() => {
    runtime.nextSpawnTimeout = null;
    if (!state.moduleB || state.finishingBlock) {
      return;
    }
    if (state.moduleB.tasks.length < state.moduleB.currentLevelConfig.task_queue_size) {
      const task = createModuleBTask(state.moduleB);
      if (task) {
        state.moduleB.tasks.push(task);
      }
    }
    applyModuleBStatusShift(state.moduleB);
    renderModuleBScene();
    scheduleNextModuleBSpawn();
  }, delay);
}

function scheduleNextModuleBRuleUpdate() {
  const runtime = state.moduleB;
  if (!runtime || runtime.nextRuleUpdateTimeout || state.finishingBlock) {
    return;
  }
  const intervalSeconds = runtime.currentLevelConfig.update_interval_seconds;
  if (!intervalSeconds || intervalSeconds >= 900) {
    return;
  }
  runtime.nextRuleUpdateTimeout = window.setTimeout(() => {
    runtime.nextRuleUpdateTimeout = null;
    void rotateModuleBRules();
    scheduleNextModuleBRuleUpdate();
  }, intervalSeconds * 1000);
}

async function rotateModuleBRules() {
  const runtime = state.moduleB;
  if (!runtime) {
    return;
  }
  runtime.activeRules = pickModuleBRules(runtime.currentLevelConfig.rule_count, runtime.activeRules.map((rule) => rule.id));
  runtime.ruleVersion += 1;
  syncModuleBRuleLine();
  await postBlockEvent({
    event_type: "system",
    event_subtype: "rule_update",
    marker_event_name: "B_rule_update",
    difficulty_level: runtime.currentLevel,
    zone_or_task_area: "",
    expected_action: "",
    actual_action: runtime.activeRules.map((rule) => rule.id).join(","),
    correctness: "updated",
    reaction_time_ms: "",
    rule_version: runtime.ruleVersion,
    queue_size: runtime.tasks.length,
  });
  renderModuleBScene();
}

function createModuleBTask(runtime) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const template = pickRandom(MODULE_B_TASK_TEMPLATES);
    const zone = pickRandom(["A", "B", "C", "D"]);
    const priority = pickModuleBPriority(runtime.currentLevelConfig.critical_task_ratio);
    const minBattery = randomBetween(...template.batteryRange);
    const requiresNight = hasRule(runtime, "night_gate") ? Math.random() < 0.35 : Math.random() < 0.1;
    const windBand = hasRule(runtime, "wind_gate") ? pickRandom(["medium", "high"]) : pickRandom(["low", "medium"]);
    const deadlineWindow = randomBetween(...runtime.currentLevelConfig.decision_time_ms);
    const task = {
      id: `T${runtime.nextTaskId++}`,
      label: template.label,
      type: template.type,
      zone,
      priority,
      minBattery,
      requiresNight,
      windBand,
      createdAt: performance.now(),
      deadlineAt: performance.now() + deadlineWindow,
    };
    const recommendation = getModuleBRecommendation(runtime, task, performance.now());
    if (recommendation?.drone) {
      return task;
    }
  }
  return null;
}

function getModuleBRecommendation(runtime, task, now) {
  const candidates = runtime.drones
    .map((drone) => {
      const evaluation = evaluateDroneForTask(runtime, drone, task, now);
      return {
        drone,
        valid: evaluation.valid,
        score: evaluation.score,
      };
    })
    .filter((item) => item.valid)
    .sort((left, right) => right.score - left.score);
  return candidates[0] ?? null;
}

function evaluateModuleBAssignment(runtime, task, drone, recommendation, now) {
  const evaluation = evaluateDroneForTask(runtime, drone, task, now);
  if (!evaluation.valid) {
    return {correctness: "rule_violation"};
  }
  if (task.priority === "critical" && recommendation?.drone?.id !== drone.id) {
    return {correctness: "priority_error"};
  }
  if (recommendation?.drone?.id !== drone.id) {
    return {correctness: "suboptimal_assignment"};
  }
  return {correctness: "correct"};
}

function evaluateDroneForTask(runtime, drone, task, now) {
  if (drone.busyUntil > now) {
    return {valid: false, score: -Infinity};
  }
  if (!drone.types.includes(task.type)) {
    return {valid: false, score: -Infinity};
  }
  if (!drone.zones.includes(task.zone)) {
    return {valid: false, score: -Infinity};
  }
  if (drone.battery < task.minBattery) {
    return {valid: false, score: -Infinity};
  }
  if (hasRule(runtime, "night_gate") && task.requiresNight && !drone.night) {
    return {valid: false, score: -Infinity};
  }
  if (hasRule(runtime, "wind_gate") && task.windBand === "high" && drone.windClass < 2) {
    return {valid: false, score: -Infinity};
  }
  if (hasRule(runtime, "reserve_gate") && drone.battery - estimateTaskDrain(task) < 20) {
    return {valid: false, score: -Infinity};
  }

  let score = drone.battery;
  if (drone.windClass >= 2 && task.windBand === "high") {
    score += 18;
  }
  if (drone.night && task.requiresNight) {
    score += 15;
  }
  if (task.type === "relay" && hasRule(runtime, "relay_bias") && drone.types.includes("relay")) {
    score += 24;
  }
  if (task.priority === "critical" && hasRule(runtime, "critical_best_battery")) {
    score += drone.battery;
  }
  if (task.type === "delivery" && drone.windClass >= 3) {
    score += 10;
  }
  return {valid: true, score};
}

function consumeDroneAfterAssignment(drone, task, now) {
  drone.battery = Math.max(8, drone.battery - estimateTaskDrain(task));
  drone.busyUntil = now + randomBetween(800, 1800);
}

function applyModuleBStatusShift(runtime) {
  if (!runtime || Math.random() > runtime.currentLevelConfig.status_change_rate) {
    return;
  }
  const drone = pickRandom(runtime.drones);
  if (!drone) {
    return;
  }
  drone.battery = Math.max(12, drone.battery - randomBetween(4, 9));
}

function syncModuleBDrones(runtime, droneCount) {
  const nextIds = new Set(MODULE_B_DRONE_CATALOG.slice(0, droneCount).map((drone) => drone.id));
  runtime.drones = MODULE_B_DRONE_CATALOG
    .slice(0, droneCount)
    .map((template) => runtime.drones.find((drone) => drone.id === template.id) ?? {
      ...template,
      busyUntil: 0,
    });
  runtime.tasks = runtime.tasks.filter((task) => getModuleBRecommendation(runtime, task, performance.now())?.drone);
  if (!nextIds.has(runtime.selectedDroneId)) {
    runtime.selectedDroneId = runtime.drones[0]?.id ?? "";
  }
}

function removeModuleBTask(taskId) {
  const runtime = state.moduleB;
  if (!runtime) {
    return;
  }
  runtime.tasks = runtime.tasks.filter((task) => task.id !== taskId);
  if (runtime.selectedTaskIndex >= runtime.tasks.length) {
    runtime.selectedTaskIndex = Math.max(0, runtime.tasks.length - 1);
  }
}

function buildModuleBDrones(droneCount) {
  return MODULE_B_DRONE_CATALOG.slice(0, droneCount).map((drone) => ({
    ...drone,
    busyUntil: 0,
  }));
}

function pickModuleBRules(ruleCount, excludeIds = []) {
  const pool = MODULE_B_RULE_LIBRARY.filter((rule) => !excludeIds.includes(rule.id));
  const source = pool.length >= ruleCount ? [...pool] : [...MODULE_B_RULE_LIBRARY];
  const picked = [];
  while (picked.length < ruleCount && source.length) {
    const index = Math.floor(Math.random() * source.length);
    picked.push(source.splice(index, 1)[0]);
  }
  return picked;
}

function pickModuleBPriority(criticalRatio) {
  const seed = Math.random();
  if (seed < criticalRatio) {
    return "critical";
  }
  if (seed < criticalRatio + 0.36) {
    return "high";
  }
  return "medium";
}

function hasRule(runtime, ruleId) {
  return runtime.activeRules.some((rule) => rule.id === ruleId);
}

function syncModuleBRuleLine() {
  const runtime = state.moduleB;
  if (!runtime || !runtime.ruleNode) {
    return;
  }
  runtime.ruleNode.textContent = `规则 ${runtime.ruleVersion}：${runtime.activeRules.map((rule) => rule.label).join(" / ")}`;
}

async function finishBlock() {
  if (state.finishingBlock) {
    return;
  }
  if (state.block?.moduleName === "module_a" && state.moduleA?.activeEvent) {
    state.moduleA.blockEndingPending = true;
    return;
  }
  state.finishingBlock = true;
  if (state.moduleA && state.selectedMode === "adaptive" && state.moduleA.currentWindow.targets + state.moduleA.currentWindow.hits + state.moduleA.currentWindow.misses + state.moduleA.currentWindow.falseAlarms > 0) {
    await finalizeModuleAWindow(true);
  }
  if (state.moduleB && state.selectedMode === "adaptive" && (state.moduleB.currentWindow.assignments > 0 || state.moduleB.currentWindow.timeouts > 0)) {
    await finalizeModuleBWindow(true);
  }
  clearTimers();
  window.removeEventListener("keydown", handleBlockKeydown);
  const response = await fetch(`/api/session/${state.session.sessionToken}/block/complete`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: "{}",
  });
  const data = await response.json();
  renderResult(data);
}

function renderResult(data) {
  setImmersiveMode(false);
  appRoot.innerHTML = "";
  const node = cloneTemplate("result-template");
  node.querySelector("#result-title").textContent = state.bootstrap.modules[state.selectedModule].label;
  node.querySelector("#result-note").textContent = "";
  node.querySelector("#result-levels").textContent = `${data.summary.difficultyLevelStart} -> ${data.summary.difficultyLevelEnd}`;
  node.querySelector("#result-events").textContent = String(data.summary.totalEvents);
  node.querySelector("#result-logdir").textContent = compactPath(data.sessionDir);
  node.querySelector("#result-metrics").textContent = formatResultMetrics(state.selectedModule, data.summary.accuracyMetrics);
  node.querySelector("#restart-btn").addEventListener("click", () => {
    renderSetup();
  });
  appRoot.appendChild(node);
}

function formatResultMetrics(moduleName, metrics) {
  if (moduleName === "module_b") {
    return formatModuleBResultMetrics(metrics);
  }
  return formatModuleAResultMetrics(metrics);
}

function formatModuleAResultMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return "暂无指标";
  }
  const rows = [
    ["目标事件数", metrics.target_count],
    ["命中率", formatRatio(metrics.hit_rate)],
    ["漏报率", formatRatio(metrics.miss_rate)],
    ["误按率", formatRatio(metrics.false_alarm_rate)],
    ["平均反应时(ms)", formatNumber(metrics.mean_rt)],
    ["反应时波动(ms)", formatNumber(metrics.rt_std)],
    ["前后期表现变化", formatSignedNumber(metrics.performance_drift)],
    ["时间窗数量", metrics.window_count],
  ];
  return rows
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label}: ${value === null ? "-" : value}`)
    .join("\n");
}

function formatModuleBResultMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return "暂无指标";
  }
  const rows = [
    ["任务处理数", metrics.assignment_count],
    ["分配正确率", formatRatio(metrics.correct_rate)],
    ["关键任务正确率", formatRatio(metrics.priority_accuracy)],
    ["优先级错误率", formatRatio(metrics.priority_error_rate)],
    ["规则违背率", formatRatio(metrics.rule_violation_rate)],
    ["次优分配率", formatRatio(metrics.suboptimal_rate)],
    ["超时率", formatRatio(metrics.timeout_rate)],
    ["平均决策时(ms)", formatNumber(metrics.mean_decision_time_ms)],
    ["规则更新数", metrics.rule_update_count],
    ["前后期表现变化", formatSignedNumber(metrics.performance_drift)],
    ["时间窗数量", metrics.window_count],
  ];
  return rows
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label}: ${value === null ? "-" : value}`)
    .join("\n");
}

function formatRatio(value) {
  if (typeof value !== "number") {
    return value ?? "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  if (typeof value !== "number") {
    return value ?? "-";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatSignedNumber(value) {
  if (typeof value !== "number") {
    return value ?? "-";
  }
  if (value > 0) {
    return `+${value.toFixed(3)}`;
  }
  if (value < 0) {
    return value.toFixed(3);
  }
  return "0.000";
}

async function postBlockEvent(payload) {
  const response = await fetch(`/api/session/${state.session.sessionToken}/event`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  state.eventCount = data.eventCount;
  return data;
}

function updateBlockStats() {
  const countNode = document.querySelector("#event-count");
  const lastKeyNode = document.querySelector("#last-key");
  if (countNode) {
    countNode.textContent = String(state.eventCount);
  }
  if (lastKeyNode) {
    lastKeyNode.textContent = state.lastKey;
  }
}

function getModuleALevelConfig(level) {
  return state.bootstrap.modules.module_a.levels[level];
}

function getModuleBLevelConfig(level) {
  return state.bootstrap.modules.module_b.levels[level];
}

function getActiveInstrumentIds(count) {
  return MODULE_A_INSTRUMENTS.slice(0, count).map((item) => item.id);
}

function pickModuleAEventType(levelConfig) {
  const targetRatio = levelConfig.target_alarm_ratio ?? Math.max(0, 1 - levelConfig.pseudo_alarm_ratio - levelConfig.noncritical_ratio);
  const noncriticalRatio = levelConfig.noncritical_ratio ?? Math.max(0, 1 - targetRatio - levelConfig.pseudo_alarm_ratio);
  const seed = Math.random();
  if (seed < targetRatio) {
    return "target_alarm";
  }
  if (seed < targetRatio + noncriticalRatio) {
    return "noncritical_change";
  }
  return "pseudo_alarm";
}

function lampClassForEvent(type) {
  if (type === "target_alarm") {
    return "lamp-target";
  }
  if (type === "pseudo_alarm") {
    return "lamp-pseudo";
  }
  return "lamp-noncritical";
}

function createWindowMetrics(index, level) {
  return {
    index,
    level,
    targets: 0,
    nonTargets: 0,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    idleFalseAlarms: 0,
    reactionTimes: [],
  };
}

function createModuleBWindowMetrics(index, level) {
  return {
    index,
    level,
    assignments: 0,
    correct: 0,
    priorityErrors: 0,
    ruleViolations: 0,
    suboptimal: 0,
    timeouts: 0,
    criticalAssignments: 0,
    criticalCorrect: 0,
    decisionTimes: [],
  };
}

function shiftLevel(currentLevel, delta) {
  const levels = state.bootstrap.levels;
  const nextIndex = Math.min(levels.length - 1, Math.max(0, levels.indexOf(currentLevel) + delta));
  return levels[nextIndex];
}

function average(values) {
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTo(value, digits) {
  return Number(value.toFixed(digits));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function compactPath(fullPath) {
  if (!fullPath) {
    return "-";
  }
  const parts = fullPath.split("/");
  return parts.slice(-2).join("/");
}

function formatTaskPriority(priority) {
  if (priority === "critical") {
    return "关键";
  }
  if (priority === "high") {
    return "高";
  }
  return "中";
}

function formatTaskType(type) {
  if (type === "recon") {
    return "侦察";
  }
  if (type === "patrol") {
    return "巡查";
  }
  if (type === "relay") {
    return "中继";
  }
  return "投送";
}

function formatWindBand(windBand) {
  if (windBand === "high") {
    return "强风";
  }
  if (windBand === "medium") {
    return "中风";
  }
  return "低风";
}

function priorityClass(priority) {
  if (priority === "critical") {
    return "is-critical";
  }
  if (priority === "high") {
    return "is-high";
  }
  return "is-medium";
}

function markerForModuleBOutcome(correctness) {
  if (correctness === "correct") {
    return "B_correct";
  }
  if (correctness === "priority_error") {
    return "B_priority_error";
  }
  if (correctness === "rule_violation") {
    return "B_rule_violation";
  }
  return "B_suboptimal";
}

function estimateTaskDrain(task) {
  const base = Math.round(task.minBattery * 0.3);
  const priorityCost = task.priority === "critical" ? 6 : task.priority === "high" ? 4 : 2;
  const windCost = task.windBand === "high" ? 6 : task.windBand === "medium" ? 3 : 1;
  return base + priorityCost + windCost;
}

function setImmersiveMode(isImmersive) {
  document.body.classList.toggle("immersive-mode", isImmersive);
}

function cloneTemplate(id) {
  return document.querySelector(`#${id}`).content.firstElementChild.cloneNode(true);
}

function clearTimers() {
  if (state.countdownTimer) {
    window.clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
  if (state.blockTimer) {
    window.clearInterval(state.blockTimer);
    state.blockTimer = null;
  }
  if (state.moduleA?.nextEventTimeout) {
    window.clearTimeout(state.moduleA.nextEventTimeout);
  }
  if (state.moduleA?.activeEventTimeout) {
    window.clearTimeout(state.moduleA.activeEventTimeout);
  }
  if (state.moduleB?.nextSpawnTimeout) {
    window.clearTimeout(state.moduleB.nextSpawnTimeout);
  }
  if (state.moduleB?.nextRuleUpdateTimeout) {
    window.clearTimeout(state.moduleB.nextRuleUpdateTimeout);
  }
  window.removeEventListener("keydown", handleBlockKeydown);
}
