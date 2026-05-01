const organizeCurrentButton = document.querySelector("#organizeCurrentButton");
const consolidateButton = document.querySelector("#consolidateButton");
const undoButton = document.querySelector("#undoButton");
const statusElement = document.querySelector("#status");
let undoAvailableState = false;

const ACTIONS = {
  ORGANIZE_CURRENT_WINDOW: {
    command: "tab-organizer organize --window=current",
    pendingLines: [
      "screen tabs",
      "classify hosts",
      "write groups"
    ]
  },
  CONSOLIDATE_ACROSS_WINDOWS: {
    command: "tab-organizer collect --windows=all --target=current",
    pendingLines: [
      "scan windows",
      "screen tabs",
      "move eligible tabs",
      "write groups"
    ]
  },
  UNDO_LAST_ORGANIZATION: {
    command: "tab-organizer undo --last",
    pendingLines: [
      "load snapshot",
      "restore windows",
      "restore groups"
    ]
  }
};

organizeCurrentButton.addEventListener("click", async () => {
  await runAction("ORGANIZE_CURRENT_WINDOW");
});

consolidateButton.addEventListener("click", async () => {
  await runAction("CONSOLIDATE_ACROSS_WINDOWS");
});

undoButton.addEventListener("click", async () => {
  await runAction("UNDO_LAST_ORGANIZATION");
});

document.addEventListener("DOMContentLoaded", refreshStatus);
refreshStatus();

async function runAction(type) {
  const action = ACTIONS[type];

  setBusy(true);
  await runTerminalSequence(action.command, action.pendingLines);
  const response = await sendMessage({ type });

  if (!response.ok) {
    await typeTerminal([`> ${action.command}`, `error: ${response.error || "Something went wrong."}`]);
    setBusy(false);
    return;
  }

  await renderStatus(response.summary, response.undoAvailable, action.command, true);
  undoAvailableState = Boolean(response.undoAvailable);
  setBusy(false);
}

async function refreshStatus() {
  const response = await sendMessage({ type: "GET_STATUS" });

  if (!response.ok) {
    renderTerminal(["> tab-organizer status", `error: ${response.error || "Unable to load status."}`]);
    undoAvailableState = false;
    undoButton.disabled = true;
    return;
  }

  renderStatus(response.summary, response.undoAvailable, "tab-organizer status");
  undoAvailableState = Boolean(response.undoAvailable);
  setBusy(false);
}

async function sendMessage(message) {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    if (message.type === "GET_STATUS") {
      return {
        ok: true,
        summary: null,
        undoAvailable: false
      };
    }

    return {
      ok: true,
      summary: createFakeSummary(message.type),
      undoAvailable: message.type !== "UNDO_LAST_ORGANIZATION"
    };
  }

  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

function setBusy(isBusy) {
  organizeCurrentButton.disabled = isBusy;
  consolidateButton.disabled = isBusy;
  undoButton.disabled = isBusy || !undoAvailableState;
}

async function renderStatus(summary, undoAvailable, command, shouldType = false) {
  const renderer = shouldType ? typeTerminal : renderTerminal;

  if (!summary) {
    await renderer([`> ${command}`, "ready: organize this window or collect all windows"]);
    return;
  }

  if (typeof summary.tabsRestored === "number") {
    await renderer([
      `> ${command}`,
      `restored: ${summary.tabsRestored} tabs`,
      `windows: ${summary.windowsProcessed}`
    ]);
    return;
  }

  const screenedText = summary.screenedOutTabs
    ? ` ${summary.screenedOutTabs} tabs were screened out.`
    : "";
  const movedText = summary.tabsMovedAcrossWindows
    ? ` Moved ${summary.tabsMovedAcrossWindows} tabs into this window.`
    : "";
  const windowText = summary.mode === "currentWindow"
    ? "this window"
    : `${summary.windowsProcessed} windows`;

  await renderer([
    `> ${command}`,
    `organized: ${summary.tabsOrganized} tabs`,
    `groups: ${summary.groupsCreated}`,
    `scope: ${windowText}`,
    movedText.trim(),
    screenedText.trim(),
    undoAvailable ? "undo: available" : ""
  ].filter(Boolean));
}

function renderTerminal(lines) {
  statusElement.textContent = lines.join("\n");
}

async function runTerminalSequence(command, pendingLines) {
  await typeTerminal([`> ${command}`], { lineDelay: 120 });

  for (const line of pendingLines) {
    await appendTerminalLine(`run: ${line} ...`);
  }
}

async function typeTerminal(lines, options = {}) {
  const text = lines.join("\n");
  const lineDelay = options.lineDelay ?? 180;
  statusElement.classList.add("is-typing");
  statusElement.textContent = "";

  for (let index = 0; index < text.length; index += 1) {
    statusElement.textContent += text[index];
    await delay(text[index] === "\n" ? lineDelay : 12);
  }

  statusElement.classList.remove("is-typing");
}

async function appendTerminalLine(line) {
  statusElement.classList.add("is-typing");
  statusElement.textContent += `\n`;

  for (let index = 0; index < line.length; index += 1) {
    statusElement.textContent += line[index];
    await delay(10);
  }

  statusElement.classList.remove("is-typing");
}

function createFakeSummary(type) {
  if (type === "UNDO_LAST_ORGANIZATION") {
    return {
      timestamp: Date.now(),
      windowsProcessed: 2,
      tabsRestored: 18,
      groupsRestored: 5
    };
  }

  if (type === "CONSOLIDATE_ACROSS_WINDOWS") {
    return {
      timestamp: Date.now(),
      mode: "crossWindow",
      windowsProcessed: 3,
      tabsOrganized: 24,
      groupsCreated: 6,
      screenedOutTabs: 3,
      tabsMovedAcrossWindows: 14
    };
  }

  return {
    timestamp: Date.now(),
    mode: "currentWindow",
    windowsProcessed: 1,
    tabsOrganized: 9,
    groupsCreated: 3,
    screenedOutTabs: 1,
    tabsMovedAcrossWindows: 0
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
