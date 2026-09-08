# publicSuffix

**Permission string:** `publicSuffix`
**API namespace:** `chrome.publicSuffix`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.publicSuffix` API to query the browser's Public Suffix List (PSL).

## What it's for (broad)

Query the Public Suffix List: get the registrable domain of a host and test known suffixes. Broadly: correct same-site grouping of cookies/history/tabs, phishing and look-alike-domain checks, and anything that must reason about "the real site" behind a hostname.
