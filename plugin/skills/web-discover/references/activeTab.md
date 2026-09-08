# activeTab

**Permission string:** `activeTab`
**API namespace:** capability permission — no dedicated `chrome.*` namespace

## Interface (official)

Gives temporary access to the active tab through a user gesture.

## What it's for (broad)

A consent-free grant of host access and scripting to the tab the user just acted on, valid until they navigate away. Broadly: the least-privilege way to read or transform the current page on demand (clip it, extract data, fill a form, inject a tool) without asking for permanent all-sites access.
