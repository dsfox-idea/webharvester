# contextMenus

**Permission string:** `contextMenus`
**API namespace:** `chrome.contextMenus`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.contextMenus` API to add items to Google Chrome's context menu. You can choose what types of objects your context menu additions apply to, such as images, hyperlinks, and pages.

**Functions**
- `contextMenus.create()` — Creates a new context menu item.
- `contextMenus.update()` — Updates a previously created context menu item.
- `contextMenus.remove()` — Removes a context menu item.
- `contextMenus.removeAll()` — Removes all context menu items added by this extension.

**Events**
- `contextMenus.onClicked` — Fired when a context menu item is clicked.

## What it's for (broad)

Add the extension's own items to the right-click menu, scoped to selection, links, images, pages, or specific URL patterns. Broadly: the main surface for turning "the thing under the cursor" into an action (search, send, translate, save, lookup).
