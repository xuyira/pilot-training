const state = {
  bootstrap: null,
  session: null,
  block: null,
  countdownTimer: null,
  blockTimer: null,
  blockStartedAt: null,
  eventCount: 0,
  lastKey: "-",
  selectedModule: "module_a",
  selectedMode: "fixed",
  selectedLevel: "L1",
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
  state.session = null;
  state.block = null;
  state.eventCount = 0;
  state.lastKey = "-";

  appRoot.innerHTML = "";
  const node = cloneTemplate("setup-template");
  const form = node.querySelector("#setup-form");
  const moduleButtons = node.querySelectorAll("[data-module]");
  const modeButtons = node.querySelectorAll("[data-mode]");
  const levelGrid = node.querySelector("#level-grid");
  const hint = node.querySelector("#setup-hint");

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
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.module_name = state.selectedModule;
    payload.mode = state.selectedMode;
    payload.start_level = state.selectedLevel;
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
  appRoot.innerHTML = "";
  const node = cloneTemplate("countdown-template");
  const moduleMeta = state.bootstrap.modules[state.selectedModule];
  node.querySelector("#countdown-module-title").textContent = moduleMeta.label;
  node.querySelector("#countdown-mode-line").textContent = `${moduleMeta.description} · ${state.selectedMode === "fixed" ? "固定难度" : "自适应难度"} · ${state.selectedLevel}`;
  const numberNode = node.querySelector("#countdown-number");
  appRoot.appendChild(node);

  let remaining = state.bootstrap.ui.countdown_seconds;
  numberNode.textContent = String(remaining);

  state.countdownTimer = window.setInterval(async () => {
    remaining -= 1;
    if (remaining <= 0) {
      clearTimers();
      numberNode.textContent = "GO";
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
  appRoot.innerHTML = "";
  const node = cloneTemplate("block-template");
  const moduleMeta = state.bootstrap.modules[state.block.moduleName];
  node.querySelector("#block-module-title").textContent = moduleMeta.label;
  node.querySelector("#block-module-desc").textContent = moduleMeta.description;
  node.querySelector("#block-mode").textContent = state.selectedMode === "fixed" ? "固定难度" : "自适应难度";
  node.querySelector("#block-level").textContent = state.block.level;
  node.querySelector("#block-id").textContent = `#${state.block.blockId}`;
  node.querySelector("#key-hints").textContent = state.block.moduleSpec.keyHints;
  node.querySelector("#session-dir").textContent = compactPath(state.session.sessionDir);
  node.querySelector("#level-config").textContent = JSON.stringify(state.block.levelConfig, null, 2);

  const moduleLines = node.querySelector("#module-lines");
  state.block.moduleSpec.introLines.forEach((line) => {
    const item = document.createElement("div");
    item.className = "info-item";
    item.innerHTML = `<strong>${line}</strong>`;
    moduleLines.appendChild(item);
  });

  appRoot.appendChild(node);
  window.addEventListener("keydown", handleBlockKeydown);

  const timerNode = node.querySelector("#block-timer");
  state.blockTimer = window.setInterval(async () => {
    const elapsedSeconds = Math.floor((performance.now() - state.blockStartedAt) / 1000);
    const remaining = Math.max(0, state.block.durationSeconds - elapsedSeconds);
    timerNode.textContent = `${remaining}s`;
    if (remaining <= 0) {
      await finishBlock();
    }
  }, 200);
}

async function handleBlockKeydown(event) {
  if (!state.block) {
    return;
  }
  if (event.repeat) {
    return;
  }
  const reactionTime = Math.round(performance.now() - state.blockStartedAt);
  state.lastKey = event.key;
  const response = await fetch(`/api/session/${state.session.sessionToken}/event`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      event_type: "response",
      event_subtype: "placeholder_key",
      actual_action: event.key,
      reaction_time_ms: reactionTime,
    }),
  });
  const data = await response.json();
  state.eventCount = data.eventCount;
  updateBlockStats();
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

async function finishBlock() {
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

function compactPath(fullPath) {
  if (!fullPath) {
    return "-";
  }
  const parts = fullPath.split("/");
  return parts.slice(-2).join("/");
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
  window.removeEventListener("keydown", handleBlockKeydown);
}
