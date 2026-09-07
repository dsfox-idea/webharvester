# webRequestAuthProvider

**Permission string:** `webRequestAuthProvider`
**API namespace:** `chrome.webRequest`

## Interface (Chromium 153.0.8010.18)

Allows an MV3 extension to answer chrome.webRequest.onAuthRequired asynchronously with credentials (the only blocking-style webRequest handler still available without policy installation).

**Events**
- `webRequest.onAuthRequired` — Fired when an authentication failure is received.

## What it's for (broad)

Answer HTTP authentication challenges (chrome.webRequest.onAuthRequired) asynchronously, including with credentials. Broadly: automatic proxy/site auth, SSO helpers, and unattended automation that must get past basic/digest/proxy auth.
