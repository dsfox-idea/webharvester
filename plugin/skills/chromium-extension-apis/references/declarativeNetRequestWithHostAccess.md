# declarativeNetRequestWithHostAccess

**Permission string:** `declarativeNetRequestWithHostAccess`
**API namespace:** capability permission — no dedicated `chrome.*` namespace

## Interface (official)

Gives access to the chrome.declarativeNetRequest API but requires host permissions for all actions.

## What it's for (broad)

The same request-modification power as declarativeNetRequest, but every rule action is gated on host permissions the user granted. Broadly: a ruleset engine that acts only where the user has opted in, e.g. per-site rewriters and header tools.
