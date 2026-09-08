# tabs

**Permission string:** `tabs`
**API namespace:** `chrome.tabs`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.tabs` API to interact with the browser's tab system. You can use this API to create, modify, and rearrange tabs in the browser.

**Functions**
- `tabs.get()` — Retrieves details about the specified tab.
- `tabs.getCurrent()` — Gets the tab that this script call is being made from.
- `tabs.connect()` — Connects to the content script(s) in the specified tab.
- `tabs.sendRequest()` — Sends a single request to the content script(s) in the specified tab, with an optional callback to run when a response is sent back.
- `tabs.sendMessage()` — Sends a single message to the content script(s) in the specified tab.
- `tabs.getSelected()` — Gets the tab that is selected in the specified window.
- `tabs.getAllInWindow()` — Gets details about all tabs in the specified window.
- `tabs.create()` — Creates a new tab.
- `tabs.duplicate()` — Duplicates a tab.
- `tabs.query()` — Gets all tabs that have the specified properties, or all tabs if no properties are specified.
- `tabs.highlight()` — Highlights the given tabs and focuses on the first of group.
- `tabs.update()` — Modifies the properties of a tab.
- `tabs.move()` — Moves one or more tabs to a new position within its window, or to a new window.
- `tabs.reload()` — Reload a tab.
- `tabs.remove()` — Closes one or more tabs.
- `tabs.group()` — Adds one or more tabs to a specified group, or if no group is specified, adds the given tabs to a newly created group.
- `tabs.ungroup()` — Removes one or more tabs from their respective groups.
- `tabs.detectLanguage()` — Detects the primary language of the content in a tab.
- `tabs.captureVisibleTab()` — Captures the visible area of the currently active tab in the specified window.
- `tabs.executeScript()` — Injects JavaScript code into a page.
- `tabs.insertCSS()` — Injects CSS into a page.
- `tabs.removeCSS()` — Removes from a page CSS that was previously injected by a call to `scripting.insertCSS`.
- `tabs.setZoom()` — Zooms a specified tab.
- `tabs.getZoom()` — Gets the current zoom factor of a specified tab.
- `tabs.setZoomSettings()` — Sets the zoom settings for a specified tab, which define how zoom changes are handled.
- `tabs.getZoomSettings()` — Gets the current zoom settings of a specified tab.
- `tabs.discard()` — Discards a tab from memory.
- `tabs.goForward()` — Go foward to the next page, if one is available.
- `tabs.goBack()` — Go back to the previous page, if one is available.

**Events**
- `tabs.onCreated` — Fired when a tab is created.
- `tabs.onUpdated` — Fired when a tab is updated.
- `tabs.onMoved` — Fired when a tab is moved within a window.
- `tabs.onSelectionChanged` — Fires when the selected tab in a window changes.
- `tabs.onActiveChanged` — Fires when the selected tab in a window changes.
- `tabs.onActivated` — Fires when the active tab in a window changes.
- `tabs.onHighlightChanged` — Fired when the highlighted or selected tabs in a window changes.
- `tabs.onHighlighted` — Fired when the highlighted or selected tabs in a window changes.
- `tabs.onDetached` — Fired when a tab is detached from a window; for example, because it was moved between windows.
- `tabs.onAttached` — Fired when a tab is attached to a window; for example, because it was moved between windows.
- `tabs.onRemoved` — Fired when a tab is closed.
- `tabs.onReplaced` — Fired when a tab is replaced with another tab due to prerendering or instant.
- `tabs.onZoomChange` — Fired when a tab is zoomed.

## What it's for (broad)

Create, query, move, update, reload, and close tabs and windows, and read their metadata (with host access, their URLs). Broadly: the backbone of tab and window management, navigation automation, and multi-tab orchestration.
