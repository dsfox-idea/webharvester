# system.storage

**Permission string:** `system.storage`
**API namespace:** `chrome.system.storage`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.system.storage` API to query storage device information and be notified when a removable storage device is attached and detached.

**Functions**
- `system.storage.getInfo()` — Get the storage information from the system.
- `system.storage.ejectDevice()` — Ejects a removable storage device.

**Events**
- `system.storage.onAttached` — Fired when a new removable storage is attached to the system.
- `system.storage.onDetached` — Fired when a removable storage is detached from the system.

## What it's for (broad)

List storage volumes with capacity and type, watch attach/detach, and eject removable media. Broadly: storage dashboards, removable-media workflows, and space-aware download/caching decisions.
