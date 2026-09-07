# desktopCapture

**Permission string:** `desktopCapture`
**API namespace:** `chrome.desktopCapture`

## Interface (Chromium 153.0.8010.18)

The Desktop Capture API captures the content of the screen, individual windows, or individual tabs.

**Functions**
- `desktopCapture.chooseDesktopMedia()` — Shows desktop media picker UI with the specified set of sources.
- `desktopCapture.cancelChooseDesktopMedia()` — Hides desktop media picker dialog shown by chooseDesktopMedia().

## What it's for (broad)

Prompt the user to pick a screen, window, or tab and hand back a media stream for it. Broadly: screen recorders, screenshot/annotation tools, remote support and screen sharing, and visual test capture.
