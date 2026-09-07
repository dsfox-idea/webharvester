# bookmarks

**Permission string:** `bookmarks`
**API namespace:** `chrome.bookmarks`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.bookmarks` API to create, organize, and otherwise manipulate bookmarks. Also see Override Pages, which you can use to create a custom Bookmark Manager page.

**Functions**
- `bookmarks.get()` — Retrieves the specified BookmarkTreeNode(s).
- `bookmarks.getChildren()` — Retrieves the children of the specified BookmarkTreeNode id.
- `bookmarks.getRecent()` — Retrieves the recently added bookmarks.
- `bookmarks.getTree()` — Retrieves the entire Bookmarks hierarchy.
- `bookmarks.getSubTree()` — Retrieves part of the Bookmarks hierarchy, starting at the specified node.
- `bookmarks.search()` — Searches for BookmarkTreeNodes matching the given query.
- `bookmarks.create()` — Creates a bookmark or folder under the specified parentId.
- `bookmarks.move()` — Moves the specified BookmarkTreeNode to the provided location.
- `bookmarks.update()` — Updates the properties of a bookmark or folder.
- `bookmarks.remove()` — Removes a bookmark or an empty bookmark folder.
- `bookmarks.removeTree()` — Recursively removes a bookmark folder.

**Events**
- `bookmarks.onCreated` — Fired when a bookmark or folder is created.
- `bookmarks.onRemoved` — Fired when a bookmark or folder is removed.
- `bookmarks.onChanged` — Fired when a bookmark or folder changes.
- `bookmarks.onMoved` — Fired when a bookmark or folder is moved to a different parent folder.
- `bookmarks.onChildrenReordered` — Fired when the children of a folder have changed their order due to the order being sorted in the UI.
- `bookmarks.onImportBegan` — Fired when a bookmark import session is begun.
- `bookmarks.onImportEnded` — Fired when a bookmark import session is ended.

## What it's for (broad)

Full read/write access to the bookmark tree. Broadly: bookmark managers, cross-device or cross-browser sync, taggers and deduplicators, read-later pipelines, and bulk import/export or reorganization tools.
