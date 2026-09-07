# cookies

**Permission string:** `cookies`
**API namespace:** `chrome.cookies`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.cookies` API to query and modify cookies, and to be notified when they change.

**Functions**
- `cookies.get()` — Retrieves information about a single cookie.
- `cookies.getAll()` — Retrieves all cookies from a single cookie store that match the given information.
- `cookies.set()` — Sets a cookie with the given cookie data; may overwrite equivalent cookies if they exist.
- `cookies.remove()` — Deletes a cookie by name.
- `cookies.getAllCookieStores()` — Lists all existing cookie stores.
- `cookies.getPartitionKey()` — The partition key for the frame indicated.

**Events**
- `cookies.onChanged` — Fired when a cookie is set or removed.

## What it's for (broad)

Read, write, and watch cookies for any host the extension has access to, across cookie stores. Broadly: session managers and account switchers, auth debugging, consent/tracking auditing, and moving a logged-in session between profiles or tools.
