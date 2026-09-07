# alarms

**Permission string:** `alarms`
**API namespace:** `chrome.alarms`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.alarms` API to schedule code to run periodically or at a specified time in the future.

**Functions**
- `alarms.create()` — Creates an alarm.
- `alarms.get()` — Retrieves details about the specified alarm.
- `alarms.getAll()` — Gets an array of all the alarms.
- `alarms.clear()` — Clears the alarm with the given name.
- `alarms.clearAll()` — Clears all alarms.

**Events**
- `alarms.onAlarm` — Fired when an alarm has elapsed.

## What it's for (broad)

Schedule wake-ups by delay or wall-clock time that survive the service worker going idle. Broadly: the heartbeat of any background automation, polling, periodic sync, cache expiry, reminder, or cron-like task in an MV3 extension.
