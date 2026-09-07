# debugger

**Permission string:** `debugger`
**API namespace:** `chrome.debugger`

## Interface (Chromium 153.0.8010.18)

The `chrome.debugger` API serves as an alternate transport for Chrome's remote debugging protocol. Use `chrome.debugger` to attach to one or more tabs to instrument network interaction, debug JavaScript, mutate the DOM and CSS, and more. Use the `Debuggee` property `tabId` to target tabs with `sendCommand` and route events by `tabId` from `onEvent` callbacks.

**Functions**
- `debugger.attach()` — Attaches debugger to the given target.
- `debugger.detach()` — Detaches debugger from the given target.
- `debugger.sendCommand()` — Sends given command to the debugging target.
- `debugger.getTargets()` — Returns the list of available debug targets.

**Events**
- `debugger.onEvent` — Fired whenever debugging target issues instrumentation event.
- `debugger.onDetach` — Fired when browser terminates debugging session for the tab.

## What it's for (broad)

Attach the Chrome DevTools Protocol to tabs, letting the extension drive the same low-level control DevTools uses. Broadly: deep automation and instrumentation, network and DOM interception beyond declarative APIs, performance/coverage capture, and headless-style scripting of real pages.
