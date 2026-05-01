import { CATEGORY_ORDER, classifyTab } from "./categories.js";
import { countScreeningReasons, screenTab } from "./screener.js";

export function buildWindowPlan(tabs) {
  const sortedTabs = [...tabs].sort((a, b) => a.index - b.index);
  const startIndex = sortedTabs.filter((tab) => tab.pinned).length;

  return buildPlanFromOrderedTabs(sortedTabs, startIndex);
}

export function buildCrossWindowPlan(orderedTabs, targetWindowId) {
  const targetPinnedCount = orderedTabs.filter((tab) => tab.windowId === targetWindowId && tab.pinned).length;

  return buildPlanFromOrderedTabs(orderedTabs, targetPinnedCount);
}

function buildPlanFromOrderedTabs(orderedTabs, startIndex) {
  const sortedTabs = [...orderedTabs];
  const screenedTabs = sortedTabs.map((tab) => ({
    tab,
    screen: screenTab(tab)
  }));
  const candidates = screenedTabs
    .filter((item) => item.screen.eligible)
    .map((item) => item.tab)
    .map((tab) => ({
      tab,
      category: classifyTab(tab)
    }));
  const skippedTabs = screenedTabs
    .filter((item) => !item.screen.eligible)
    .map((item) => ({
      tabId: item.tab.id,
      originalIndex: item.tab.index,
      reason: item.screen.reason,
      reasonLabel: item.screen.reasonLabel
    }));

  const groups = [];
  const groupedTabIds = new Set();

  for (const category of CATEGORY_ORDER) {
    const items = candidates.filter((item) => item.category === category);
    if (items.length < 2) {
      continue;
    }

    const tabIds = items.map((item) => item.tab.id);
    tabIds.forEach((id) => groupedTabIds.add(id));
    groups.push({
      category,
      tabIds,
      originalIndexes: items.map((item) => item.tab.index)
    });
  }

  const singles = candidates
    .filter((item) => !groupedTabIds.has(item.tab.id))
    .map((item) => ({
      tabId: item.tab.id,
      category: item.category,
      originalIndex: item.tab.index
    }));

  return {
    pinnedTabIds: skippedTabs.filter((tab) => tab.reason === "pinned").map((tab) => tab.tabId),
    startIndex,
    groups,
    singles,
    skippedTabs,
    screeningReasonCounts: countScreeningReasons(screenedTabs),
    orderedTabIds: [
      ...groups.flatMap((group) => group.tabIds),
      ...singles.map((single) => single.tabId)
    ],
    skippedPinnedCount: skippedTabs.filter((tab) => tab.reason === "pinned").length,
    screenedOutCount: skippedTabs.length,
    organizedTabCount: candidates.length,
    groupCount: groups.length
  };
}
