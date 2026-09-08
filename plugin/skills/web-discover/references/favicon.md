# favicon

**Permission string:** `favicon`
**API namespace:** capability permission — no dedicated `chrome.*` namespace

## Interface (official)

Grants access to the Favicon API: chrome-extension://<id>/_favicon/?pageUrl=<url>&size=<px> returns the cached favicon of any page.

## What it's for (broad)

Fetch the browser's cached favicon for any page URL through the _favicon/ resource. Broadly: render authentic site icons in bookmark managers, tab/session UIs, history views, and dashboards without hitting the network.
