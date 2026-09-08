# history

**Permission string:** `history`
**API namespace:** `chrome.history`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.history` API to interact with the browser's record of visited pages. You can add, remove, and query for URLs in the browser's history. To override the history page with your own version, see Override Pages.

**Functions**
- `history.search()` — Searches the history for the last visit time of each page matching the query.
- `history.getVisits()` — Retrieves information about visits to a URL.
- `history.addUrl()` — Adds a URL to the history at the current time with a transition type of "link".
- `history.deleteUrl()` — Removes all occurrences of the given URL from the history.
- `history.deleteRange()` — Removes all items within the specified date range from the history.
- `history.deleteAll()` — Deletes all items from the history.

**Events**
- `history.onVisited` — Fired when a URL is visited, providing the `HistoryItem` data for that URL.
- `history.onVisitRemoved` — Fired when one or more URLs are removed from history.

## What it's for (broad)

Read and modify the browsing history: search visits, add or delete URLs, and watch changes. Broadly: history search and analytics, privacy scrubbing of specific entries, activity timelines, and export to external tools.
