# Tab Organizer

A Manifest V3 Chrome extension that screens, categorizes, groups, and reorders open tabs from a local popup. By default it uses local rules only. Optionally, it can ask a local proxy server to categorize tabs with OpenAI or Anthropic without bundling API keys into the extension.

## Current Features

- Organize the focused Chrome window into local category groups.
- Collect eligible tabs from all normal Chrome windows into the focused window.
- Screen out pinned tabs, browser pages, local files, and unsupported protocols before organizing.
- Generate session-specific category names with an optional local AI proxy for OpenAI or Anthropic.
- Fall back to local hardcoded rules when the AI proxy is unavailable.
- Group only categories with two or more eligible tabs.
- Leave one-off tabs ungrouped after grouped categories.
- Keep groups expanded.
- Store a one-level snapshot for undo.
- Restore tab order, pinned state, and previous group metadata on best-effort undo.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this project folder: `/Users/timkim/Documents/New project`.
5. Pin the `Tab Organizer` extension from the Chrome toolbar.

## Popup Actions

- `Organize / This Window`: screens and organizes eligible tabs in the currently focused normal window.
- `Collect / All Windows`: screens all normal windows, moves eligible tabs into the focused window, then groups them.
- `Undo / Last Move`: restores the most recent saved snapshot where tabs and windows still exist.

## Categories

When the AI proxy is running, category names are generated from the currently open eligible tab titles, hostnames, and URLs. Examples:

- Design
- AI
- Travel
- Research
- Email
- Finance

Generated category names are intentionally simple single-topic labels. Compound labels such as `Email & Chat` are avoided.

When the AI proxy is unavailable, the extension falls back to these local categories:

- Work & Projects
- Learning & Reference
- Messages & Meetings
- Video, Music & News
- Shopping & Orders
- Money & Billing
- Social Networks
- AI
- Miscellaneous

## Development

The extension can run with only local rules. To enable AI categorization, start the local classifier server before using the popup.

OpenAI:

```bash
OPENAI_API_KEY=your_key npm run ai:server
```

Anthropic:

```bash
AI_PROVIDER=anthropic ANTHROPIC_API_KEY=your_key npm run ai:server
```

You can also create a local `.env` file:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key
```

Then start the proxy:

```bash
npm run ai:server
```

The extension calls `http://127.0.0.1:8787/classify-tabs`. API keys stay in your shell environment or local `.env` file and are not bundled into the Chrome extension.

Run tests:

```bash
npm test
```

Run tests plus syntax checks:

```bash
npm run validate
```

## Project Structure

- `manifest.json`: Chrome extension manifest.
- `src/background.js`: Chrome runtime message handling and tab operations.
- `src/shared/categories.js`: local category classifier rules.
- `src/shared/screener.js`: automatic eligibility filter.
- `src/shared/organizer.js`: pure grouping and ordering plan logic.
- `src/popup/`: popup UI, terminal animation, and runtime messaging.
- `test/`: unit tests for classifier, screener, and organizer planning.
