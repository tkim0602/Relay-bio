import assert from "node:assert/strict";
import test from "node:test";

import { screenTab } from "../src/shared/screener.js";

test("screenTab allows normal web tabs", () => {
  assert.deepEqual(screenTab({ id: 1, url: "https://example.com", pinned: false }), {
    eligible: true,
    reason: null,
    reasonLabel: null
  });
});

test("screenTab skips pinned tabs before URL checks", () => {
  const result = screenTab({ id: 1, url: "https://github.com", pinned: true });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "pinned");
});

test("screenTab skips browser and extension pages", () => {
  assert.equal(screenTab({ id: 1, url: "chrome://extensions", pinned: false }).reason, "browserPage");
  assert.equal(screenTab({ id: 2, url: "chrome-extension://abc/popup.html", pinned: false }).reason, "browserPage");
});

test("screenTab skips local files and unsupported protocols", () => {
  assert.equal(screenTab({ id: 1, url: "file:///Users/test/report.pdf", pinned: false }).reason, "localFile");
  assert.equal(screenTab({ id: 2, url: "mailto:test@example.com", pinned: false }).reason, "unsupportedProtocol");
});
