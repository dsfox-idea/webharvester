# proxy

**Permission string:** `proxy`
**API namespace:** `chrome.proxy`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.proxy` API to manage Chrome's proxy settings. This API relies on the ChromeSetting prototype of the type API for getting and setting the proxy configuration.

**Events**
- `proxy.onProxyError` — Notifies about proxy errors.

## What it's for (broad)

Read and control the browser's proxy configuration (fixed servers, PAC scripts, bypass lists) and observe proxy errors. Broadly: VPN/proxy front-ends, per-context routing, geo and testing setups, and privacy routing.
