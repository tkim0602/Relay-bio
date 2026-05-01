export const CATEGORY_ORDER = [
  "Work",
  "Research",
  "Communication",
  "Media",
  "Shopping",
  "Finance",
  "Social",
  "Other"
];

export const CATEGORY_COLORS = {
  Work: "blue",
  Research: "cyan",
  Communication: "green",
  Media: "purple",
  Shopping: "orange",
  Finance: "yellow",
  Social: "pink",
  Other: "grey"
};

const CATEGORY_RULES = {
  Work: {
    domains: [
      "asana.com",
      "atlassian.net",
      "basecamp.com",
      "clickup.com",
      "docs.google.com",
      "drive.google.com",
      "figma.com",
      "github.com",
      "gitlab.com",
      "linear.app",
      "microsoft365.com",
      "miro.com",
      "monday.com",
      "notion.so",
      "office.com",
      "sheets.google.com",
      "trello.com",
      "vercel.com"
    ],
    keywords: [
      "dashboard",
      "document",
      "figma",
      "issue",
      "jira",
      "kanban",
      "notion",
      "project",
      "pull request",
      "spreadsheet",
      "task",
      "workspace"
    ]
  },
  Research: {
    domains: [
      "arxiv.org",
      "developer.chrome.com",
      "developer.mozilla.org",
      "docs.python.org",
      "google.com",
      "scholar.google.com",
      "stackoverflow.com",
      "wikipedia.org"
    ],
    keywords: [
      "api reference",
      "documentation",
      "docs",
      "guide",
      "how to",
      "reference",
      "research",
      "search",
      "tutorial",
      "wikipedia"
    ]
  },
  Communication: {
    domains: [
      "discord.com",
      "gmail.com",
      "mail.google.com",
      "messenger.com",
      "outlook.live.com",
      "outlook.office.com",
      "slack.com",
      "teams.microsoft.com",
      "web.whatsapp.com",
      "zoom.us"
    ],
    keywords: [
      "chat",
      "discord",
      "gmail",
      "inbox",
      "mail",
      "meeting",
      "messages",
      "outlook",
      "slack",
      "teams"
    ]
  },
  Media: {
    domains: [
      "apple.com",
      "netflix.com",
      "news.google.com",
      "spotify.com",
      "twitch.tv",
      "vimeo.com",
      "youtube.com",
      "youtu.be"
    ],
    keywords: [
      "audio",
      "episode",
      "movie",
      "music",
      "news",
      "podcast",
      "show",
      "spotify",
      "stream",
      "video",
      "youtube"
    ]
  },
  Shopping: {
    domains: [
      "amazon.com",
      "bestbuy.com",
      "ebay.com",
      "etsy.com",
      "shopify.com",
      "target.com",
      "walmart.com"
    ],
    keywords: [
      "cart",
      "checkout",
      "coupon",
      "deal",
      "order",
      "product",
      "sale",
      "shop",
      "store"
    ]
  },
  Finance: {
    domains: [
      "americanexpress.com",
      "bankofamerica.com",
      "capitalone.com",
      "chase.com",
      "coinbase.com",
      "paypal.com",
      "robinhood.com",
      "stripe.com",
      "wise.com"
    ],
    keywords: [
      "bank",
      "billing",
      "budget",
      "crypto",
      "finance",
      "invoice",
      "payment",
      "statement",
      "tax"
    ]
  },
  Social: {
    domains: [
      "bsky.app",
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "reddit.com",
      "tiktok.com",
      "twitter.com",
      "x.com"
    ],
    keywords: [
      "facebook",
      "feed",
      "instagram",
      "linkedin",
      "post",
      "reddit",
      "social",
      "tiktok",
      "tweet"
    ]
  }
};

export function classifyTab(tab) {
  const hostname = getHostname(tab.url);
  const title = normalize(tab.title);

  for (const category of CATEGORY_ORDER) {
    if (category === "Other") {
      continue;
    }

    const rules = CATEGORY_RULES[category];
    if (matchesAnyDomain(hostname, rules.domains)) {
      return category;
    }
  }

  for (const category of CATEGORY_ORDER) {
    if (category === "Other") {
      continue;
    }

    const rules = CATEGORY_RULES[category];
    if (rules.keywords.some((keyword) => title.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}

export function getHostname(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function matchesAnyDomain(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function normalize(value) {
  return String(value || "").toLowerCase();
}
