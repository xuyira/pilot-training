const MODULE_A_INSTRUMENTS = [
  {id: "airspeed", title: "空速表", code: "IAS", zone: "动力/推进", lampLeft: 6.2, lampTop: 12.2},
  {id: "attitude", title: "姿态仪", code: "ATT", zone: "导航/航电", lampLeft: 29.4, lampTop: 12.2},
  {id: "altimeter", title: "高度表", code: "ALT", zone: "导航/航电", lampLeft: 52.8, lampTop: 12.2},
  {id: "turn", title: "转弯侧滑仪", code: "TRN", zone: "通信/链路", lampLeft: 76.2, lampTop: 12.2},
  {id: "heading", title: "航向仪", code: "HDG", zone: "任务载荷/系统状态", lampLeft: 6.2, lampTop: 59.8},
  {id: "vsi", title: "升降速度表", code: "VSI", zone: "动力/推进", lampLeft: 29.4, lampTop: 59.8},
  {id: "engine", title: "发动机监控", code: "ENG", zone: "动力/推进", lampLeft: 52.8, lampTop: 59.8},
  {id: "navcom", title: "导航通信", code: "COM", zone: "通信/链路", lampLeft: 76.2, lampTop: 59.8},
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
      hint.textContent = state.bootstrap.modules[state.selectedModule].description;
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

  hint.textContent = state.bootstrap.modules[state.selectedModule].description;

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
    renderModuleBPlaceholder(node.querySelector("#module-scene"));
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
    windowElapsed: 0,
    lastWindowIndex: 0,
    promoteStreak: 0,
    lastAdaptAction: "hold",
    windows: [],
    currentWindow: createWindowMetrics(1, level),
    anchorNodes: new Map(),
    lampNodes: new Map(),
  };
  renderModuleAScene();
  scheduleNextModuleAEvent();
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

function renderModuleBPlaceholder(sceneNode) {
  sceneNode.className = "module-scene monitor-grid monitor-grid-immersive";
  sceneNode.innerHTML = `
    <div class="monitor-tile">控制任务区</div>
    <div class="monitor-tile">导航任务区</div>
    <div class="monitor-tile">通信任务区</div>
    <div class="monitor-tile">模块 B 待实现</div>
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

  const reactionTime = Math.round(performance.now() - state.blockStartedAt);
  state.lastKey = event.key;
  const data = await postBlockEvent({
    event_type: "response",
    event_subtype: "placeholder_key",
    actual_action: event.key,
    reaction_time_ms: reactionTime,
  });
  state.eventCount = data.eventCount;
  updateBlockStats();
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
    clearModuleAEvent();
    scheduleNextModuleAEvent();
    updateBlockStats();
    return;
  }

  runtime.currentWindow.falseAlarms += 1;
  await postBlockEvent({
    event_type: "response",
    event_subtype: "false_alarm",
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

function scheduleNextModuleAEvent() {
  const runtime = state.moduleA;
  if (!runtime || runtime.activeEvent) {
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
  if (!runtime || runtime.activeEvent) {
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
  };
  runtime.activeEvent = event;

  if (type === "target_alarm") {
    runtime.currentWindow.targets += 1;
    runtime.activeEventTimeout = window.setTimeout(() => {
      void handleModuleATargetMiss();
    }, runtime.currentLevelConfig.response_window_ms);
  } else {
    runtime.activeEventTimeout = window.setTimeout(() => {
      clearModuleAEvent();
      scheduleNextModuleAEvent();
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
  clearModuleAEvent();
  scheduleNextModuleAEvent();
  updateBlockStats();
}

function clearModuleAEvent() {
  clearActiveEventTimeouts();
  if (state.moduleA) {
    state.moduleA.activeEvent = null;
    renderModuleAScene();
  }
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
  if (!runtime || state.selectedMode !== "adaptive") {
    return;
  }
  const elapsedSeconds = Math.floor((performance.now() - state.blockStartedAt) / 1000);
  const currentWindowIndex = Math.floor(elapsedSeconds / runtime.currentLevelConfig.window_seconds);
  if (currentWindowIndex <= runtime.lastWindowIndex || elapsedSeconds === 0) {
    return;
  }
  runtime.lastWindowIndex = currentWindowIndex;
  void finalizeModuleAWindow();
}

async function finalizeModuleAWindow(force = false) {
  const runtime = state.moduleA;
  if (!runtime) {
    return;
  }
  const targets = runtime.currentWindow.targets;
  const hits = runtime.currentWindow.hits;
  const misses = runtime.currentWindow.misses;
  const falseAlarms = runtime.currentWindow.falseAlarms;
  const hitRate = targets ? hits / targets : 1;
  const missRate = targets ? misses / targets : 0;
  const falseAlarmRate = targets ? falseAlarms / targets : falseAlarms > 0 ? 1 : 0;
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
    };
    const goodWindow = targets > 0
      && hitRate >= moduleThresholds.hitMin
      && falseAlarmRate <= moduleThresholds.falseMax
      && missRate <= moduleThresholds.missMax
      && (meanRt === null || meanRt <= moduleThresholds.meanRtMax);
    const poorWindow = missRate > moduleThresholds.missMax || falseAlarmRate > moduleThresholds.falseMax || (meanRt !== null && meanRt > moduleThresholds.meanRtMax * 1.1);

    if (goodWindow) {
      runtime.promoteStreak += 1;
      if (runtime.promoteStreak >= moduleThresholds.promoteStreakRequired) {
        nextLevel = shiftLevel(runtime.currentLevel, 1);
        adaptAction = nextLevel === runtime.currentLevel ? "hold" : "up";
        runtime.promoteStreak = adaptAction === "up" ? 0 : runtime.promoteStreak;
      }
    } else {
      runtime.promoteStreak = 0;
      if (poorWindow) {
        nextLevel = shiftLevel(runtime.currentLevel, -1);
        adaptAction = nextLevel === runtime.currentLevel ? "hold" : "down";
      }
    }
  }

  runtime.windows.push({
    index: runtime.currentWindow.index,
    level: runtime.currentLevel,
    hitRate,
    missRate,
    falseAlarmRate,
    meanRt,
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
    window_hit_rate: roundTo(hitRate, 3),
    window_miss_rate: roundTo(missRate, 3),
    window_false_alarm_rate: roundTo(falseAlarmRate, 3),
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
    runtime.currentWindow = createWindowMetrics(runtime.currentWindow.index + 1, runtime.currentLevel);
  }
}

async function finishBlock() {
  if (state.finishingBlock) {
    return;
  }
  state.finishingBlock = true;
  if (state.moduleA && state.selectedMode === "adaptive" && state.moduleA.currentWindow.targets + state.moduleA.currentWindow.hits + state.moduleA.currentWindow.misses + state.moduleA.currentWindow.falseAlarms > 0) {
    await finalizeModuleAWindow(true);
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
  node.querySelector("#result-title").textContent = `${state.bootstrap.modules[state.selectedModule].label} · Block ${data.summary.blockId}`;
  node.querySelector("#result-note").textContent = data.summary.notes;
  node.querySelector("#result-levels").textContent = `${data.summary.difficultyLevelStart} -> ${data.summary.difficultyLevelEnd}`;
  node.querySelector("#result-events").textContent = String(data.summary.totalEvents);
  node.querySelector("#result-adapt").textContent = data.adaptAction;
  node.querySelector("#result-logdir").textContent = compactPath(data.sessionDir);
  node.querySelector("#result-metrics").textContent = JSON.stringify(data.summary.accuracyMetrics, null, 2);
  node.querySelector("#restart-btn").addEventListener("click", () => {
    renderSetup();
  });
  appRoot.appendChild(node);
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
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    reactionTimes: [],
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
  window.removeEventListener("keydown", handleBlockKeydown);
}
