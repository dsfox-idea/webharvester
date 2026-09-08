# sidePanel

**Permission string:** `sidePanel`
**API namespace:** `chrome.sidePanel`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.sidePanel` API to host content in the browser's side panel alongside the main content of a webpage.

**Functions**
- `sidePanel.setOptions()` — Configures the side panel.
- `sidePanel.getOptions()` — Returns the active panel configuration.
- `sidePanel.setPanelBehavior()` — Configures the extension's side panel behavior.
- `sidePanel.getPanelBehavior()` — Returns the extension's current side panel behavior.
- `sidePanel.open()` — Opens the side panel for the extension.
- `sidePanel.getLayout()` — Returns the side panel's current layout.
- `sidePanel.close()` — Closes the extension's side panel.

**Events**
- `sidePanel.onOpened` — Fired when the extension's side panel is opened.
- `sidePanel.onClosed` — Fired when the extension's side panel is closed.

## What it's for (broad)

Host the extension's own persistent UI in the browser side panel, globally or per tab. Broadly: a durable workspace that stays put across navigation: assistants, readers, notes, dashboards, and companions.
