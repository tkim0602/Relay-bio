import assert from "node:assert/strict";
import test from "node:test";

import { buildCrossWindowPlan, buildWindowPlan } from "../src/shared/organizer.js";

function tab(overrides) {
  return {
    id: overrides.id,
    index: overrides.index,
    pinned: false,
    title: "",
    url: "https://example.invalid",
    ...overrides
  };
}

test("buildWindowPlan excludes pinned tabs and starts organization after them", () => {
  const plan = buildWindowPlan([
    tab({ id: 1, index: 0, pinned: true, url: "https://mail.google.com" }),
    tab({ id: 2, index: 1, url: "https://github.com/a" }),
    tab({ id: 3, index: 2, url: "https://github.com/b" })
  ]);

  assert.deepEqual(plan.pinnedTabIds, [1]);
  assert.equal(plan.startIndex, 1);
  assert.equal(plan.skippedPinnedCount, 1);
  assert.equal(plan.screenedOutCount, 1);
  assert.deepEqual(plan.groups.map((group) => group.category), ["Work"]);
  assert.deepEqual(plan.groups[0].tabIds, [2, 3]);
});

test("buildWindowPlan creates groups only for categories with at least two tabs", () => {
  const plan = buildWindowPlan([
    tab({ id: 1, index: 0, url: "https://github.com/a" }),
    tab({ id: 2, index: 1, url: "https://github.com/b" }),
    tab({ id: 3, index: 2, url: "https://amazon.com/item" })
  ]);

  assert.deepEqual(plan.groups.map((group) => group.category), ["Work"]);
  assert.deepEqual(plan.singles, [
    {
      tabId: 3,
      category: "Shopping",
      originalIndex: 2
    }
  ]);
});

test("buildWindowPlan emits grouped tabs in fixed category order before singles", () => {
  const plan = buildWindowPlan([
    tab({ id: 1, index: 0, url: "https://youtube.com/watch?v=1" }),
    tab({ id: 2, index: 1, url: "https://github.com/a" }),
    tab({ id: 3, index: 2, url: "https://youtube.com/watch?v=2" }),
    tab({ id: 4, index: 3, url: "https://github.com/b" }),
    tab({ id: 5, index: 4, url: "https://reddit.com/r/test" })
  ]);

  assert.deepEqual(plan.groups.map((group) => group.category), ["Work", "Media"]);
  assert.deepEqual(plan.orderedTabIds, [2, 4, 1, 3, 5]);
  assert.equal(plan.groupCount, 2);
  assert.equal(plan.organizedTabCount, 5);
});

test("buildWindowPlan screens out non-web tabs before classification and grouping", () => {
  const plan = buildWindowPlan([
    tab({ id: 1, index: 0, url: "chrome://extensions", title: "GitHub docs" }),
    tab({ id: 2, index: 1, url: "https://github.com/a" }),
    tab({ id: 3, index: 2, url: "https://github.com/b" }),
    tab({ id: 4, index: 3, url: "file:///Users/test/report.pdf" })
  ]);

  assert.deepEqual(plan.groups.map((group) => group.category), ["Work"]);
  assert.deepEqual(plan.groups[0].tabIds, [2, 3]);
  assert.deepEqual(plan.skippedTabs, [
    {
      tabId: 1,
      originalIndex: 0,
      reason: "browserPage",
      reasonLabel: "Browser page"
    },
    {
      tabId: 4,
      originalIndex: 3,
      reason: "localFile",
      reasonLabel: "Local file"
    }
  ]);
  assert.deepEqual(plan.screeningReasonCounts, {
    browserPage: 1,
    localFile: 1
  });
  assert.equal(plan.organizedTabCount, 2);
});

test("buildCrossWindowPlan consolidates eligible tabs across windows into fixed category groups", () => {
  const plan = buildCrossWindowPlan(
    [
      tab({ id: 1, windowId: 10, index: 0, pinned: true, url: "https://mail.google.com" }),
      tab({ id: 2, windowId: 10, index: 1, url: "https://youtube.com/watch?v=1" }),
      tab({ id: 3, windowId: 20, index: 0, pinned: true, url: "https://github.com/pinned" }),
      tab({ id: 4, windowId: 20, index: 1, url: "https://github.com/a" }),
      tab({ id: 5, windowId: 20, index: 2, url: "https://youtube.com/watch?v=2" }),
      tab({ id: 6, windowId: 30, index: 0, url: "https://github.com/b" })
    ],
    10
  );

  assert.equal(plan.startIndex, 1);
  assert.deepEqual(plan.groups.map((group) => group.category), ["Work", "Media"]);
  assert.deepEqual(plan.orderedTabIds, [4, 6, 2, 5]);
  assert.deepEqual(plan.pinnedTabIds, [1, 3]);
  assert.equal(plan.skippedPinnedCount, 2);
  assert.equal(plan.organizedTabCount, 4);
});
