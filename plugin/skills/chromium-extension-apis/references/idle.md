# idle

**Permission string:** `idle`
**API namespace:** `chrome.idle`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.idle` API to detect when the machine's idle state changes.

**Functions**
- `idle.queryState()` — Returns "locked" if the system is locked, "idle" if the user has not generated any input for a specified number of seconds, or "active" otherwise.
- `idle.setDetectionInterval()` — Sets the interval, in seconds, used to determine when the system is in an idle state for onStateChanged events.
- `idle.getAutoLockDelay()` — Gets the time, in seconds, it takes until the screen is locked automatically while idle.

**Events**
- `idle.onStateChanged` — Fired when the system changes to an active, idle or locked state.

## What it's for (broad)

Detect whether the machine is active, idle, or locked, with a configurable threshold. Broadly: pause or resume background work, presence and time-tracking, security auto-lock behavior, and scheduling heavy tasks for idle time.
