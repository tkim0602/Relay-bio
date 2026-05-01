import assert from "node:assert/strict";
import test from "node:test";

import { classifyTab, getHostname } from "../src/shared/categories.js";

test("classifyTab prefers domain matches over title keyword matches", () => {
  const tab = {
    url: "https://github.com/example/repo",
    title: "Shopping cart implementation notes"
  };

  assert.equal(classifyTab(tab), "Work");
});

test("classifyTab falls back to title keyword matches", () => {
  const tab = {
    url: "chrome://newtab",
    title: "API reference for browser extensions"
  };

  assert.equal(classifyTab(tab), "Research");
});

test("classifyTab returns Other for unknown tabs", () => {
  const tab = {
    url: "https://example.invalid/path",
    title: "Plain page"
  };

  assert.equal(classifyTab(tab), "Other");
});

test("getHostname normalizes valid hostnames and rejects non-url values", () => {
  assert.equal(getHostname("https://www.reddit.com/r/chrome"), "reddit.com");
  assert.equal(getHostname("not a url"), "");
});
