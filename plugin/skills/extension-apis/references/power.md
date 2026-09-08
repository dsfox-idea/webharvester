# power

**Permission string:** `power`
**API namespace:** `chrome.power`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.power` API to override the system's power management features.

**Functions**
- `power.requestKeepAwake()` — Requests that power management be temporarily disabled. |level| describes the degree to which power management should be disabled.
- `power.releaseKeepAwake()` — Releases a request previously made via requestKeepAwake().

## What it's for (broad)

Ask the system to keep the display awake or just prevent sleep. Broadly: keep long downloads, uploads, playback, presentations, or monitoring dashboards running without the machine dozing off.
