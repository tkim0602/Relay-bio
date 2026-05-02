import assert from "node:assert/strict";
import test from "node:test";

import { classifyTab, getHostname, normalizeGeneratedCategoryName } from "../src/shared/categories.js";

test("classifyTab prefers domain matches over title keyword matches", () => {
  const tab = {
    url: "https://github.com/example/repo",
    title: "Shopping cart implementation notes"
  };

  assert.equal(classifyTab(tab), "Work & Projects");
});

test("classifyTab falls back to title keyword matches", () => {
  const tab = {
    url: "chrome://newtab",
    title: "API reference for browser extensions"
  };

  assert.equal(classifyTab(tab), "Learning & Reference");
});

test("classifyTab returns Miscellaneous for unknown tabs", () => {
  const tab = {
    url: "https://example.invalid/path",
    title: "Plain page"
  };

  assert.equal(classifyTab(tab), "Miscellaneous");
});

test("classifyTab recognizes AI tabs", () => {
  assert.equal(classifyTab({
    url: "https://claude.ai/new",
    title: "Claude"
  }), "AI");

  assert.equal(classifyTab({
    url: "https://example.invalid/article",
    title: "Prompt engineering notes for LLM workflows"
  }), "AI");
});

test("getHostname normalizes valid hostnames and rejects non-url values", () => {
  assert.equal(getHostname("https://www.reddit.com/r/chrome"), "reddit.com");
  assert.equal(getHostname("not a url"), "");
});

test("normalizeGeneratedCategoryName keeps generated labels single-topic", () => {
  assert.equal(normalizeGeneratedCategoryName("Email & Chat"), "Email");
  assert.equal(normalizeGeneratedCategoryName("Travel / Maps"), "Travel");
  assert.equal(normalizeGeneratedCategoryName("AI Research"), "AI Research");
});
