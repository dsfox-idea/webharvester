# nativeMessaging

**Permission string:** `nativeMessaging`
**API namespace:** `chrome.runtime`

## Interface (Chromium 153.0.8010.18)

Gives access to the native messaging API: chrome.runtime.connectNative() and chrome.runtime.sendNativeMessage() talk to a registered native host process.

**Functions**
- `runtime.connectNative()` — Connects to a native application in the host machine.
- `runtime.sendNativeMessage()` — Send a single message to a native application.

## What it's for (broad)

Exchange messages with a registered native host process on the machine. Broadly: the bridge from the browser to local software the web cannot reach: the filesystem, hardware, system tools, or a companion desktop app.
