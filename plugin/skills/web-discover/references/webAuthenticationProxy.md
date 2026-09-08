# webAuthenticationProxy

**Permission string:** `webAuthenticationProxy`
**API namespace:** `chrome.webAuthenticationProxy`

## Interface (Chromium 153.0.8010.18)

The `chrome.webAuthenticationProxy` API lets remote desktop software running on a remote host intercept Web Authentication API (WebAuthn) requests in order to handle them on a local client.

**Functions**
- `webAuthenticationProxy.completeCreateRequest()` — Reports the result of a `navigator.credentials.create()` call.
- `webAuthenticationProxy.completeGetRequest()` — Reports the result of a `navigator.credentials.get()` call.
- `webAuthenticationProxy.completeIsUvpaaRequest()` — Reports the result of a `PublicKeyCredential.isUserVerifyingPlatformAuthenticator()` call.
- `webAuthenticationProxy.attach()` — Makes this extension the active Web Authentication API request proxy.
- `webAuthenticationProxy.detach()` — Removes this extension from being the active Web Authentication API request proxy.

**Events**
- `webAuthenticationProxy.onRemoteSessionStateChange` — A native application associated with this extension can cause this event to be fired by writing to a file with a name equal to the extension's ID in a directory named `WebAuthenticationProxyRemoteSessionStateChange` inside the default user data directory The contents of the file should be empty.
- `webAuthenticationProxy.onCreateRequest` — Fires when a WebAuthn `navigator.credentials.create()` call occurs.
- `webAuthenticationProxy.onGetRequest` — Fires when a WebAuthn navigator.credentials.get() call occurs.
- `webAuthenticationProxy.onIsUvpaaRequest` — Fires when a `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` call occurs.
- `webAuthenticationProxy.onRequestCanceled` — Fires when a `onCreateRequest` or `onGetRequest` event is canceled (because the WebAuthn request was aborted by the caller, or because it timed out).

## What it's for (broad)

Intercept and proxy the page's WebAuthn (passkey/security-key) calls through the extension. Broadly: remote-desktop and virtualization clients that forward authenticators, and enterprise credential brokering.
