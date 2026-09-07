# downloads.shelf

**Permission string:** `downloads.shelf`
**API namespace:** `chrome.downloads`

## Interface (Chromium 153.0.8010.18)

Allows the use of chrome.downloads.setShelfEnabled() (deprecated in favour of downloads.ui).

**Functions**
- `downloads.setShelfEnabled()` — Enable or disable the gray shelf at the bottom of every window associated with the current browser profile.

## What it's for (broad)

Show or hide the classic download shelf. Broadly: replace the built-in download UI with the extension's own, or keep a kiosk/presentation surface clean. (Superseded by downloads.ui.)
