# downloads.ui

**Permission string:** `downloads.ui`
**API namespace:** `chrome.downloads`

## Interface (Chromium 153.0.8010.18)

Allows the use of chrome.downloads.setUiOptions().

**Functions**
- `downloads.setUiOptions()` — Change the download UI of every window associated with the current browser profile.

## What it's for (broad)

Enable or disable the browser's download UI as a whole. Broadly: extensions that own the download experience end to end, or suppress native chrome during automation and demos.
