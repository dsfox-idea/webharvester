# gcm

**Permission string:** `gcm`
**API namespace:** `chrome.gcm`

## Interface (Chromium 153.0.8010.18)

Use `chrome.gcm` to enable apps and extensions to send and receive messages through Firebase Cloud Messaging (FCM).

**Functions**
- `gcm.register()` — Registers the application with FCM.
- `gcm.unregister()` — Unregisters the application from FCM.
- `gcm.send()` — Sends a message according to its contents.

**Events**
- `gcm.onMessage` — Fired when a message is received through FCM.
- `gcm.onMessagesDeleted` — Fired when a FCM server had to delete messages sent by an app server to the application.
- `gcm.onSendError` — Fired when it was not possible to send a message to the FCM server.

## What it's for (broad)

Register with Firebase Cloud Messaging and receive server-pushed messages in the extension. Broadly: real-time notifications, server-initiated sync and commands, and keeping a background agent in step with a backend without polling.
