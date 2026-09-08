# webRequest

**Permission string:** `webRequest`
**API namespace:** `chrome.webRequest`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.webRequest` API to observe and analyze traffic and to intercept, block, or modify requests in-flight.

**Functions**
- `webRequest.handlerBehaviorChanged()` — Needs to be called when the behavior of the webRequest handlers has changed to prevent incorrect handling due to caching.

**Events**
- `webRequest.onBeforeRequest` — Fired when a request is about to occur.
- `webRequest.onBeforeSendHeaders` — Fired before sending an HTTP request, once the request headers are available.
- `webRequest.onSendHeaders` — Fired just before a request is going to be sent to the server (modifications of previous onBeforeSendHeaders callbacks are visible by the time onSendHeaders is fired).
- `webRequest.onHeadersReceived` — Fired when HTTP response headers of a request have been received.
- `webRequest.onAuthRequired` — Fired when an authentication failure is received.
- `webRequest.onResponseStarted` — Fired when the first byte of the response body is received.
- `webRequest.onBeforeRedirect` — Fired when a server-initiated redirect is about to occur.
- `webRequest.onCompleted` — Fired when a request is completed.
- `webRequest.onErrorOccurred` — Fired when an error occurs.
- `webRequest.onActionIgnored` — Fired when an extension's proposed modification to a network request is ignored.

## What it's for (broad)

Observe the request lifecycle across the browser (before send, headers, redirects, completion, errors) for hosts the extension can access. Broadly: monitoring, analytics, debugging, security inspection, and (with the auth-provider permission) answering auth challenges.
