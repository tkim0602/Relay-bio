export const CATEGORY_ORDER = [
  "Work & Projects",
  "Learning & Reference",
  "Messages & Meetings",
  "Video, Music & News",
  "Shopping & Orders",
  "Money & Billing",
  "Social Networks",
  "AI",
  "Miscellaneous"
];

export const FALLBACK_CATEGORY = "Miscellaneous";

const CHROME_GROUP_COLORS = [
  "blue",
  "cyan",
  "green",
  "purple",
  "orange",
  "yellow",
  "pink",
  "grey"
];

export const CATEGORY_COLORS = {
  "Work & Projects": "blue",
  "Learning & Reference": "cyan",
  "Messages & Meetings": "green",
  "Video, Music & News": "purple",
  "Shopping & Orders": "orange",
  "Money & Billing": "yellow",
  "Social Networks": "pink",
  AI: "blue",
  Miscellaneous: "grey"
};

export function getCategoryColor(category, index = 0) {
  return CATEGORY_COLORS[category] || CHROME_GROUP_COLORS[index % CHROME_GROUP_COLORS.length];
}

const CATEGORY_RULES = {
  "Work & Projects": {
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
  "Learning & Reference": {
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
  "Messages & Meetings": {
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
  "Video, Music & News": {
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
  "Shopping & Orders": {
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
  "Money & Billing": {
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
  "Social Networks": {
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
  },
  AI: {
    domains: [
      "ai.google",
      "anthropic.com",
      "chat.com",
      "chatgpt.com",
      "claude.ai",
      "cursor.com",
      "gemini.google.com",
      "huggingface.co",
      "midjourney.com",
      "openai.com",
      "perplexity.ai",
      "poe.com",
      "replicate.com"
    ],
    keywords: [
      "ai",
      "anthropic",
      "artificial intelligence",
      "chatgpt",
      "claude",
      "codex",
      "cursor",
      "gemini",
      "gpt",
      "hugging face",
      "llm",
      "midjourney",
      "model",
      "openai",
      "perplexity",
      "prompt"
    ]
  }
};

export function classifyTab(tab) {
  const hostname = getHostname(tab.url);
  const title = normalize(tab.title);

  for (const category of CATEGORY_ORDER) {
    if (category === FALLBACK_CATEGORY) {
      continue;
    }

    const rules = CATEGORY_RULES[category];
    if (matchesAnyDomain(hostname, rules.domains)) {
      return category;
    }
  }

  for (const category of CATEGORY_ORDER) {
    if (category === FALLBACK_CATEGORY) {
      continue;
    }

    const rules = CATEGORY_RULES[category];
    if (rules.keywords.some((keyword) => matchesKeyword(title, keyword))) {
      return category;
    }
  }

  return FALLBACK_CATEGORY;
}

export function isCategory(value) {
  return CATEGORY_ORDER.includes(value);
}

export function normalizeCategoryName(value) {
  const normalized = String(value || "")
    .replace(/[^a-zA-Z0-9 &,/+-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32)
    .trim();

  return normalized.length >= 2 ? normalized : "";
}

export function normalizeGeneratedCategoryName(value) {
  const firstTopic = String(value || "")
    .replace(/\s+and\s+/gi, "&")
    .split(/[&,/+|-]/)[0];

  return normalizeCategoryName(firstTopic);
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

function matchesKeyword(title, keyword) {
  const normalizedKeyword = normalize(keyword);

  if (normalizedKeyword.length <= 3) {
    return new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i").test(title);
  }

  return title.includes(normalizedKeyword);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "").toLowerCase();
}
