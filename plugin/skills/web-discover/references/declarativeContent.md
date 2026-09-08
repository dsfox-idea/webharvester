# declarativeContent

**Permission string:** `declarativeContent`
**API namespace:** `chrome.declarativeContent`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.declarativeContent` API to take actions depending on the content of a page, without requiring permission to read the page's content.

**Events**
- `declarativeContent.onPageChanged`

## What it's for (broad)

Run rules that show the action button or inject scripts when page conditions match, evaluated by the browser without host permissions or reading page content. Broadly: privacy-preserving "activate only on relevant pages" behavior.
