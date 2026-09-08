# tabGroups

**Permission string:** `tabGroups`
**API namespace:** `chrome.tabGroups`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.tabGroups` API to interact with the browser's tab grouping system. You can use this API to modify and rearrange tab groups in the browser. To group and ungroup tabs, or to query what tabs are in groups, use the `chrome.tabs` API.

**Functions**
- `tabGroups.get()` — Retrieves details about the specified group.
- `tabGroups.query()` — Gets all groups that have the specified properties, or all groups if no properties are specified.
- `tabGroups.update()` — Modifies the properties of a group.
- `tabGroups.move()` — Moves the group and all its tabs within its window, or to a new window.

**Events**
- `tabGroups.onCreated` — Fired when a group is created.
- `tabGroups.onUpdated` — Fired when a group is updated.
- `tabGroups.onMoved` — Fired when a group is moved within a window.
- `tabGroups.onRemoved` — Fired when a group is closed, either directly by the user or automatically because it contained zero tabs.

## What it's for (broad)

Read and modify tab groups: create, name, color, collapse, and move them. Broadly: workspace and session organizers, automatic grouping by site or task, and focus/declutter tools.
