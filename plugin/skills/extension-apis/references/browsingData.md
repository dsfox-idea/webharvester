# browsingData

**Permission string:** `browsingData`
**API namespace:** `chrome.browsingData`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.browsingData` API to remove browsing data from a user's local profile.

**Functions**
- `browsingData.settings()` — Reports which types of data are currently selected in the 'Clear browsing data' settings UI.
- `browsingData.remove()` — Clears various types of browsing data stored in a user's profile.
- `browsingData.removeAppcache()` — Clears websites' appcache data.
- `browsingData.removeCache()` — Clears the browser's cache.
- `browsingData.removeCacheStorage()` — Clears websites' cache storage data.
- `browsingData.removeCookies()` — Clears the browser's cookies and server-bound certificates modified within a particular timeframe.
- `browsingData.removeDownloads()` — Clears the browser's list of downloaded files (not the downloaded files themselves).
- `browsingData.removeFileSystems()` — Clears websites' file system data.
- `browsingData.removeFormData()` — Clears the browser's stored form data (autofill).
- `browsingData.removeHistory()` — Clears the browser's history.
- `browsingData.removeIndexedDB()` — Clears websites' IndexedDB data.
- `browsingData.removeLocalStorage()` — Clears websites' local storage data.
- `browsingData.removePluginData()` — Clears plugins' data.
- `browsingData.removePasswords()` — Clears the browser's stored passwords.
- `browsingData.removeServiceWorkers()` — Clears websites' service workers.
- `browsingData.removeWebSQL()` — Clears websites' WebSQL data.

## What it's for (broad)

Clear browsing data (history, cache, cookies, storage, downloads, form data, passwords) by type and time range. Broadly: privacy cleaners, "forget this site" buttons, kiosk/shared-machine reset between users, and test-harness state resets.
