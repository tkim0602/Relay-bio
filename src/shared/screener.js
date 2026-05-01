export const SCREEN_REASONS = {
  pinned: "Pinned",
  missingId: "Missing tab ID",
  missingUrl: "Missing URL",
  browserPage: "Browser page",
  localFile: "Local file",
  unsupportedProtocol: "Unsupported protocol"
};

const BROWSER_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "moz-extension:"
]);

export function screenTab(tab) {
  if (tab.pinned) {
    return skip("pinned");
  }

  if (typeof tab.id !== "number") {
    return skip("missingId");
  }

  if (!tab.url) {
    return skip("missingUrl");
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return skip("unsupportedProtocol");
  }

  if (BROWSER_PROTOCOLS.has(url.protocol)) {
    return skip("browserPage");
  }

  if (url.protocol === "file:") {
    return skip("localFile");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return skip("unsupportedProtocol");
  }

  return {
    eligible: true,
    reason: null,
    reasonLabel: null
  };
}

export function countScreeningReasons(screenedTabs) {
  return screenedTabs.reduce((counts, item) => {
    if (!item.screen.eligible) {
      counts[item.screen.reason] = (counts[item.screen.reason] || 0) + 1;
    }

    return counts;
  }, {});
}

function skip(reason) {
  return {
    eligible: false,
    reason,
    reasonLabel: SCREEN_REASONS[reason]
  };
}
