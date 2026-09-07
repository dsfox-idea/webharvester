# sessions

**Permission string:** `sessions`
**API namespace:** `chrome.sessions`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.sessions` API to query and restore tabs and windows from a browsing session.

**Functions**
- `sessions.getRecentlyClosed()` — Gets the list of recently closed tabs and/or windows.
- `sessions.getDevices()` — Retrieves all devices with synced sessions.
- `sessions.restore()` — Reopens a `windows.Window` or `tabs.Tab`, with an optional callback to run when the entry has been restored.

**Events**
- `sessions.onChanged` — Fired when recently closed tabs and/or windows are changed.

## What it's for (broad)

List and restore recently closed tabs/windows and open tabs on synced devices. Broadly: session managers, cross-device continuity, "reopen where I left off," and workspace restoration.
