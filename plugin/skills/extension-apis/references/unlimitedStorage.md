# unlimitedStorage

**Permission string:** `unlimitedStorage`
**API namespace:** capability permission — no dedicated `chrome.*` namespace

## Interface (official)

Provides an unlimited quota for chrome.storage.local, IndexedDB, Cache Storage, and Origin Private File System.

## What it's for (broad)

Remove the usual quota cap on chrome.storage.local, IndexedDB, Cache Storage, and OPFS. Broadly: offline-first apps, large local caches and datasets, media libraries, and anything that must persist a lot of data locally.
