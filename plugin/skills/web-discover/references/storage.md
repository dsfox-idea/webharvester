# storage

**Permission string:** `storage`
**API namespace:** `chrome.storage`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.storage` API to store, retrieve, and track changes to user data.

**Events**
- `storage.onChanged` — Fired when one or more items change.

## What it's for (broad)

Extension-scoped key/value storage across local, sync, session, and managed areas, observable on change. Broadly: settings and state, cross-device sync of preferences, ephemeral in-memory state for the worker, and admin-pushed configuration.
