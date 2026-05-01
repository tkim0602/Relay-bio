import { CATEGORY_COLORS } from "./shared/categories.js";
import { buildCrossWindowPlan, buildWindowPlan } from "./shared/organizer.js";

const STORAGE_KEYS = {
  lastSnapshot: "lastSnapshot",
  lastRunSummary: "lastRunSummary"
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error) => {
      console.error(error);
      sendResponse({ ok: false, error: error.message || "Unexpected error" });
    });

  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "ORGANIZE_CURRENT_WINDOW":
      return organizeCurrentWindow();
    case "ORGANIZE_ALL_WINDOWS":
      return organizeAllWindows();
    case "CONSOLIDATE_ACROSS_WINDOWS":
      return consolidateAcrossWindows();
    case "UNDO_LAST_ORGANIZATION":
      return undoLastOrganization();
    case "GET_STATUS":
      return getStatus();
    default:
      return { ok: false, error: "Unknown message type" };
  }
}

async function organizeCurrentWindow() {
  const window = await getFocusedNormalWindow(true);
  const snapshot = await createSnapshot([window]);
  const plan = buildWindowPlan(window.tabs || []);
  const summary = createOrganizationSummary({
    windowsProcessed: 1,
    mode: "currentWindow",
    plans: [plan]
  });

  await applyWindowPlan(window.id, plan);
  await saveOrganizationState(snapshot, summary);

  return { ok: true, summary, undoAvailable: true };
}

async function organizeAllWindows() {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const snapshot = await createSnapshot(windows);
  const plans = [];

  for (const window of windows) {
    const tabs = window.tabs || [];
    const plan = buildWindowPlan(tabs);

    plans.push(plan);

    await applyWindowPlan(window.id, plan);
  }

  const summary = createOrganizationSummary({
    windowsProcessed: windows.length,
    mode: "allWindowsSeparate",
    plans
  });

  await saveOrganizationState(snapshot, summary);

  return { ok: true, summary, undoAvailable: true };
}

async function consolidateAcrossWindows() {
  const targetWindow = await getFocusedNormalWindow(false);
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const snapshot = await createSnapshot(windows);
  const orderedTabs = flattenWindowTabs(windows);
  const plan = buildCrossWindowPlan(orderedTabs, targetWindow.id);
  const summary = createOrganizationSummary({
    windowsProcessed: windows.length,
    mode: "crossWindow",
    targetWindowId: targetWindow.id,
    tabsMovedAcrossWindows: countMovedAcrossWindows(plan.orderedTabIds, orderedTabs, targetWindow.id),
    plans: [plan]
  });

  await applyWindowPlan(targetWindow.id, plan);
  await saveOrganizationState(snapshot, summary);

  return { ok: true, summary, undoAvailable: true };
}

async function applyWindowPlan(windowId, plan) {
  if (plan.orderedTabIds.length === 0) {
    return;
  }

  await ungroupTabsSafely(plan.orderedTabIds);

  await moveTabsSafely(plan.orderedTabIds, {
    windowId,
    index: plan.startIndex
  });

  for (const group of plan.groups) {
    const groupId = await chrome.tabs.group({
      tabIds: group.tabIds,
      createProperties: { windowId }
    });

    await chrome.tabGroups.update(groupId, {
      title: group.category,
      color: CATEGORY_COLORS[group.category],
      collapsed: false
    });
  }
}

async function createSnapshot(windows) {
  const groupIds = new Set();
  for (const window of windows) {
    for (const tab of window.tabs || []) {
      if (typeof tab.groupId === "number" && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        groupIds.add(tab.groupId);
      }
    }
  }

  const groupDetails = {};
  await Promise.all(
    [...groupIds].map(async (groupId) => {
      try {
        groupDetails[groupId] = await chrome.tabGroups.get(groupId);
      } catch {
        groupDetails[groupId] = null;
      }
    })
  );

  return {
    timestamp: Date.now(),
    windows: windows.map((window) => ({
      id: window.id,
      tabs: (window.tabs || []).map((tab) => ({
        id: tab.id,
        index: tab.index,
        pinned: tab.pinned,
        groupId: tab.groupId,
        group: groupDetails[tab.groupId] || null
      }))
    }))
  };
}

async function saveOrganizationState(snapshot, summary) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.lastSnapshot]: snapshot,
    [STORAGE_KEYS.lastRunSummary]: summary
  });
}

async function undoLastOrganization() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.lastSnapshot, STORAGE_KEYS.lastRunSummary]);
  const snapshot = data[STORAGE_KEYS.lastSnapshot];

  if (!snapshot?.windows?.length) {
    return { ok: false, error: "No organization snapshot is available to undo." };
  }

  const liveTabs = await getLiveTabsById();
  const liveWindowIds = new Set((await chrome.windows.getAll({ windowTypes: ["normal"] })).map((window) => window.id));
  let restoredTabs = 0;
  let restoredGroups = 0;

  for (const windowSnapshot of snapshot.windows) {
    if (!liveWindowIds.has(windowSnapshot.id)) {
      continue;
    }

    const tabsToRestore = windowSnapshot.tabs
      .filter((tab) => liveTabs.has(tab.id))
      .sort((a, b) => a.index - b.index);

    if (tabsToRestore.length === 0) {
      continue;
    }

    await Promise.all(
      tabsToRestore.map(async (tab) => {
        const liveTab = liveTabs.get(tab.id);
        if (liveTab.pinned !== tab.pinned) {
          await chrome.tabs.update(tab.id, { pinned: tab.pinned });
        }
      })
    );

    await ungroupTabsSafely(tabsToRestore.map((tab) => tab.id));

    await moveTabsSafely(
      tabsToRestore.map((tab) => tab.id),
      {
        windowId: windowSnapshot.id,
        index: 0
      }
    );

    const previousGroups = groupSnapshotTabs(tabsToRestore);
    for (const previousGroup of previousGroups) {
      const groupId = await chrome.tabs.group({
        tabIds: previousGroup.tabIds,
        createProperties: { windowId: windowSnapshot.id }
      });

      await chrome.tabGroups.update(groupId, buildGroupUpdate(previousGroup.group));
      restoredGroups += 1;
    }

    restoredTabs += tabsToRestore.length;
  }

  await chrome.storage.local.remove(STORAGE_KEYS.lastSnapshot);

  const summary = {
    timestamp: Date.now(),
    windowsProcessed: snapshot.windows.length,
    tabsRestored: restoredTabs,
    groupsRestored: restoredGroups
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.lastRunSummary]: summary
  });

  return { ok: true, summary, undoAvailable: false };
}

async function getStatus() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.lastSnapshot, STORAGE_KEYS.lastRunSummary]);
  return {
    ok: true,
    undoAvailable: Boolean(data[STORAGE_KEYS.lastSnapshot]),
    summary: data[STORAGE_KEYS.lastRunSummary] || null
  };
}

async function getLiveTabsById() {
  const liveTabs = await chrome.tabs.query({});
  return new Map(liveTabs.map((tab) => [tab.id, tab]));
}

function groupSnapshotTabs(tabs) {
  const grouped = new Map();

  for (const tab of tabs) {
    if (!tab.group || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      continue;
    }

    const key = tab.groupId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        group: tab.group,
        tabIds: []
      });
    }

    grouped.get(key).tabIds.push(tab.id);
  }

  return [...grouped.values()];
}

async function moveTabsSafely(tabIds, moveProperties) {
  if (tabIds.length === 0) {
    return;
  }

  try {
    await chrome.tabs.move(tabIds, moveProperties);
  } catch (error) {
    console.warn("Unable to move some tabs", error);
  }
}

async function ungroupTabsSafely(tabIds) {
  if (tabIds.length === 0) {
    return;
  }

  try {
    await chrome.tabs.ungroup(tabIds);
  } catch (error) {
    console.warn("Unable to ungroup some tabs", error);
  }
}

function buildGroupUpdate(group) {
  const update = {};

  if (typeof group.title === "string") {
    update.title = group.title;
  }

  if (group.color) {
    update.color = group.color;
  }

  if (typeof group.collapsed === "boolean") {
    update.collapsed = group.collapsed;
  }

  return update;
}

function mergeCounts(target, source) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}

async function getFocusedNormalWindow(populate) {
  return chrome.windows.getLastFocused({
    populate,
    windowTypes: ["normal"]
  });
}

function flattenWindowTabs(windows) {
  return windows.flatMap((window, windowOrder) =>
    (window.tabs || [])
      .map((tab) => ({
        ...tab,
        windowOrder
      }))
      .sort((a, b) => a.index - b.index)
  );
}

function createOrganizationSummary({ windowsProcessed, mode, targetWindowId = null, tabsMovedAcrossWindows = 0, plans }) {
  const summary = {
    timestamp: Date.now(),
    mode,
    windowsProcessed,
    tabsOrganized: 0,
    groupsCreated: 0,
    skippedPinnedTabs: 0,
    screenedOutTabs: 0,
    skippedByReason: {},
    tabsMovedAcrossWindows
  };

  for (const plan of plans) {
    summary.tabsOrganized += plan.organizedTabCount;
    summary.groupsCreated += plan.groupCount;
    summary.skippedPinnedTabs += plan.skippedPinnedCount;
    summary.screenedOutTabs += plan.screenedOutCount;
    mergeCounts(summary.skippedByReason, plan.screeningReasonCounts);
  }

  if (targetWindowId !== null) {
    summary.targetWindowId = targetWindowId;
  }

  return summary;
}

function countMovedAcrossWindows(tabIds, orderedTabs, targetWindowId) {
  const tabsById = new Map(orderedTabs.map((tab) => [tab.id, tab]));
  return tabIds.filter((tabId) => tabsById.get(tabId)?.windowId !== targetWindowId).length;
}
