# tabCapture

**Permission string:** `tabCapture`
**API namespace:** `chrome.tabCapture`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.tabCapture` API to interact with tab media streams.

**Functions**
- `tabCapture.capture()` — Captures the visible area of the currently active tab.
- `tabCapture.getCapturedTabs()` — Returns a list of tabs that have requested capture or are being captured, i.e. status != stopped and status != error.
- `tabCapture.getMediaStreamId()` — Creates a stream ID to capture the target tab.

**Events**
- `tabCapture.onStatusChanged` — Event fired when the capture status of a tab changes.

## What it's for (broad)

Capture a tab's audio and video into a MediaStream after a user gesture. Broadly: tab recorders, in-page streaming and broadcasting, audio processing, and meeting/lecture capture.
