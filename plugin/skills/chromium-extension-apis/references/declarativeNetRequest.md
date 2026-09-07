# declarativeNetRequest

**Permission string:** `declarativeNetRequest`
**API namespace:** `chrome.declarativeNetRequest`

## Interface (Chromium 153.0.8010.18)

The `chrome.declarativeNetRequest` API is used to block or modify network requests by specifying declarative rules. This lets extensions modify network requests without intercepting them and viewing their content, thus providing more privacy.

**Functions**
- `declarativeNetRequest.updateDynamicRules()` — Modifies the current set of dynamic rules for the extension.
- `declarativeNetRequest.getDynamicRules()` — Returns the current set of dynamic rules for the extension.
- `declarativeNetRequest.updateSessionRules()` — Modifies the current set of session scoped rules for the extension.
- `declarativeNetRequest.getSessionRules()` — Returns the current set of session scoped rules for the extension.
- `declarativeNetRequest.updateEnabledRulesets()` — Updates the set of enabled static rulesets for the extension.
- `declarativeNetRequest.getEnabledRulesets()` — Returns the ids for the current set of enabled static rulesets.
- `declarativeNetRequest.updateStaticRules()` — Disables and enables individual static rules in a `Ruleset`.
- `declarativeNetRequest.getDisabledRuleIds()` — Returns the list of static rules in the given `Ruleset` that are currently disabled.
- `declarativeNetRequest.getMatchedRules()` — Returns all rules matched for the extension.
- `declarativeNetRequest.setExtensionActionOptions()` — Configures if the action count for tabs should be displayed as the extension action's badge text and provides a way for that action count to be incremented.
- `declarativeNetRequest.isRegexSupported()` — Checks if the given regular expression will be supported as a `regexFilter` rule condition.
- `declarativeNetRequest.getAvailableStaticRuleCount()` — Returns the number of static rules an extension can enable before the global static rule limit is reached.
- `declarativeNetRequest.testMatchOutcome()` — Checks if any of the extension's declarativeNetRequest rules would match a hypothetical request.

**Events**
- `declarativeNetRequest.onRuleMatchedDebug` — Fired when a rule is matched with a request.

## What it's for (broad)

Block, redirect, or modify requests and headers via static/dynamic rulesets the browser enforces itself. Broadly: ad/tracker/content blockers, redirectors and rewriters, header injectors, and network policy that scales to tens of thousands of rules without a per-request callback.
