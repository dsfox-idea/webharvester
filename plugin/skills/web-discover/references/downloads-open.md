# downloads.open

**Permission string:** `downloads.open`
**API namespace:** `chrome.downloads`

## Interface (Chromium 153.0.8010.18)

Allows the use of chrome.downloads.open().

**Functions**
- `downloads.open()` — Opens the downloaded file now if the `DownloadItem` is complete; otherwise returns an error through `runtime.lastError`.

## What it's for (broad)

Open a completed download in its associated application from the extension. Broadly: finish-and-launch flows where the downloaded file should immediately open (a report, an installer, media).
