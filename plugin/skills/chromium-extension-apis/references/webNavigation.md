# webNavigation

**Permission string:** `webNavigation`
**API namespace:** `chrome.webNavigation`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.webNavigation` API to receive notifications about the status of navigation requests in-flight.

**Functions**
- `webNavigation.getFrame()` — Retrieves information about the given frame.
- `webNavigation.getAllFrames()` — Retrieves information about all frames of a given tab.

**Events**
- `webNavigation.onBeforeNavigate` — Fired when a navigation is about to occur.
- `webNavigation.onCommitted` — Fired when a navigation is committed.
- `webNavigation.onDOMContentLoaded` — Fired when the page's DOM is fully constructed, but the referenced resources may not finish loading.
- `webNavigation.onCompleted` — Fired when a document, including the resources it refers to, is completely loaded and initialized.
- `webNavigation.onErrorOccurred` — Fired when an error occurs and the navigation is aborted.
- `webNavigation.onCreatedNavigationTarget` — Fired when a new window, or a new tab in an existing window, is created to host a navigation.
- `webNavigation.onReferenceFragmentUpdated` — Fired when the reference fragment of a frame was updated.
- `webNavigation.onTabReplaced` — Fired when the contents of the tab is replaced by a different (usually previously pre-rendered) tab.
- `webNavigation.onHistoryStateUpdated` — Fired when the frame's history was updated to a new URL.

## What it's for (broad)

Observe the full navigation lifecycle of frames (committed, DOM-ready, completed, history state, errors) with frame and document ids. Broadly: precise triggering, SPA-aware routing, analytics, and coordinating injection with page state.
