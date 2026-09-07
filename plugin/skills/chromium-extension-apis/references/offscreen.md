# offscreen

**Permission string:** `offscreen`
**API namespace:** `chrome.offscreen`

## Interface (Chromium 153.0.8010.18)

Use the `offscreen` API to create and manage offscreen documents.

**Functions**
- `offscreen.createDocument()` — Creates a new offscreen document for the extension.
- `offscreen.closeDocument()` — Closes the currently-open offscreen document for the extension.
- `offscreen.hasDocument()` — Determines whether the extension has an active document.

## What it's for (broad)

Create a hidden document so the extension can use DOM-only APIs (audio playback, canvas, clipboard, DOM parsing) that a service worker lacks. Broadly: the MV3 workaround for any background job that still needs a real DOM.
