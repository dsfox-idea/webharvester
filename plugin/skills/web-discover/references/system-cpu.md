# system.cpu

**Permission string:** `system.cpu`
**API namespace:** `chrome.system.cpu`

## Interface (Chromium 153.0.8010.18)

Use the `system.cpu` API to query CPU metadata.

**Functions**
- `system.cpu.getInfo()` — Queries basic CPU information of the system.

## What it's for (broad)

Read CPU model, architecture, core count, and per-core usage. Broadly: performance monitoring and diagnostics, adapting workload to the machine, and fleet hardware inventory.
