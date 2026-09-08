# scripting

**Permission string:** `scripting`
**API namespace:** `chrome.scripting`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.scripting` API to execute script in different contexts.

**Functions**
- `scripting.executeScript()` — Injects a script into a target context.
- `scripting.insertCSS()` — Inserts a CSS stylesheet into a target context.
- `scripting.removeCSS()` — Removes a CSS stylesheet that was previously inserted by this extension from a target context.
- `scripting.registerContentScripts()` — Registers one or more content scripts for this extension.
- `scripting.getRegisteredContentScripts()` — Returns all dynamically registered content scripts for this extension that match the given filter.
- `scripting.unregisterContentScripts()` — Unregisters content scripts for this extension.
- `scripting.updateContentScripts()` — Updates one or more content scripts for this extension.

## What it's for (broad)

Inject and remove JavaScript and CSS in pages and register content scripts at runtime. Broadly: the core of page automation and augmentation in MV3: extract data, transform or restyle pages, drive flows, and light up tools in the page context.
