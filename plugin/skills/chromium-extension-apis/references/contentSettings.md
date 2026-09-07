# contentSettings

**Permission string:** `contentSettings`
**API namespace:** `chrome.contentSettings`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.contentSettings` API to change settings that control whether websites can use features such as cookies, JavaScript, and plugins. More generally speaking, content settings allow you to customize Chrome's behavior on a per-site basis instead of globally.

## What it's for (broad)

Override per-site content permissions (JavaScript, images, cookies, popups, camera/mic, location, notifications, plugins) that the browser would otherwise prompt for. Broadly: security and privacy hardening, per-site policy engines, and reproducible test environments.
