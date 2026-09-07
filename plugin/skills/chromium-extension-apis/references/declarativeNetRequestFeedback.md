# declarativeNetRequestFeedback

**Permission string:** `declarativeNetRequestFeedback`
**API namespace:** `chrome.declarativeNetRequest`

## Interface (Chromium 153.0.8010.18)

Gives permission to write errors and warnings to the DevTools console when using the chrome.declarativeNetRequest API.

**Functions**
- `declarativeNetRequest.getMatchedRules()` — Returns all rules matched for the extension.

**Events**
- `declarativeNetRequest.onRuleMatchedDebug` — Fired when a rule is matched with a request.

## What it's for (broad)

See which of your dynamic rules matched, and log rule matches to the DevTools console. Broadly: authoring, debugging, and auditing a blocking/redirect ruleset, and measuring what a policy actually catches.
