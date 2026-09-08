# readingList

**Permission string:** `readingList`
**API namespace:** `chrome.readingList`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.readingList` API to read from and modify the items in the Reading List.

**Functions**
- `readingList.addEntry()` — Adds an entry to the reading list if it does not exist.
- `readingList.removeEntry()` — Removes an entry from the reading list if it exists.
- `readingList.updateEntry()` — Updates a reading list entry if it exists.
- `readingList.query()` — Retrieves all entries that match the `QueryInfo` properties.

**Events**
- `readingList.onEntryAdded` — Triggered when a `ReadingListEntry` is added to the reading list.
- `readingList.onEntryRemoved` — Triggered when a `ReadingListEntry` is removed from the reading list.
- `readingList.onEntryUpdated` — Triggered when a `ReadingListEntry` is updated in the reading list.

## What it's for (broad)

Add, remove, update, and query entries in the browser's built-in reading list. Broadly: read-later workflows, cross-device queues, and bridges between the reading list and external note or bookmark systems.
