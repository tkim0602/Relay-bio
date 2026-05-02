import { CATEGORY_ORDER, classifyTab, normalizeCategoryName } from "./categories.js";
import { countScreeningReasons, screenTab } from "./screener.js";

export function buildWindowPlan(tabs, options = {}) {
  const sortedTabs = [...tabs].sort((a, b) => a.index - b.index);
  const startIndex = sortedTabs.filter((tab) => tab.pinned).length;

  return buildPlanFromOrderedTabs(sortedTabs, startIndex, options);
}

export function buildCrossWindowPlan(orderedTabs, targetWindowId, options = {}) {
  const targetPinnedCount = orderedTabs.filter((tab) => tab.windowId === targetWindowId && tab.pinned).length;

  return buildPlanFromOrderedTabs(orderedTabs, targetPinnedCount, options);
}

function buildPlanFromOrderedTabs(orderedTabs, startIndex, options = {}) {
  const categoryOverrides = options.categoryOverrides || new Map();
  const preferredCategoryOrder = options.categoryOrder || CATEGORY_ORDER;
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
      category: getTabCategory(tab, categoryOverrides)
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
  const categoryOrder = buildCategoryOrder(preferredCategoryOrder, candidates);

  for (const category of categoryOrder) {
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

function getTabCategory(tab, categoryOverrides) {
  const override = normalizeCategoryName(categoryOverrides.get(tab.id));
  return override || classifyTab(tab);
}

function buildCategoryOrder(preferredCategoryOrder, candidates) {
  const categoryOrder = [];
  const seen = new Set();

  for (const category of preferredCategoryOrder) {
    const normalized = normalizeCategoryName(category);
    if (normalized && !seen.has(normalized)) {
      categoryOrder.push(normalized);
      seen.add(normalized);
    }
  }

  for (const item of candidates) {
    if (!seen.has(item.category)) {
      categoryOrder.push(item.category);
      seen.add(item.category);
    }
  }

  return categoryOrder;
}
