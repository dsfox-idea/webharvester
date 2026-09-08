---
name: web-discover
description: Explore and act on the live web through the user's own real, logged-in browser — with their cookies and sessions and none of the headless or bot-wall limits of a plain fetch. Take screenshots, read a page and move or capture data between tabs, click and fill forms on the user's behalf, open and close tabs, and check pages on a timer. Use whenever a task needs to SEE or DO something on a real website as the user would: inspect or extract from a page that needs a login, act inside a web app, capture what is on screen, monitor a page over time, or drive a multi-tab flow — instead of a plain HTTP fetch, a web search, or a headless browser. This is the capability reference for the bundled all-permissions browser extension (web-harvester / Growser --enable-webharvester).
---

# web-discover

Let Claude Code explore and act on the live web the way the user does — in the
user's real, logged-in browser instead of a sandboxed fetch, a headless
session, or a web search. With the user's own cookies and sessions and none of
the headless / bot-wall limits, it can take screenshots, read a page and move
or capture data between tabs, click and fill forms on the user's behalf, open
and close tabs, and check pages on a timer. The point is to see the web through
the user's eyes and do things there for them.

Under the hood this is the **web-harvester** browser extension, which holds
every capability a Chromium extension can. This skill is the capability
reference: one short guide per permission the extension actually gets, so
Claude knows which capability to reach for. Each guide has two parts:

- **Interface** — the official description, functions and events, taken from
  the Chromium API schema (`_permission_features.json` and the `*.json` /
  `*.idl` / `*.webidl` files developer.chrome.com is generated from), at
  Chromium revision `96bc3a02d46c85d7573e6f1f899e0dda8a092d47`.
- **What it's for (broad)** — an authored note on what the capability enables
  in the widest sense.

Measured in 26.905.1 Chromium: 153.0.8010.18 (официальная сборка) (arm64) (Chromium 153.0.8010.18) on 2026-09-07.

## Running webharvester

The webharvester extension (which declares every working permission) can run
two ways:

- **Standalone, manual.** Load the extension into any Chromium browser:
  chrome://extensions -> Developer mode -> Load unpacked, or launch with
  `--load-extension=<path>`. Install this skill/plugin separately. A
  command-line-loaded unpacked extension does not persist across restarts, so
  either keep launching with the flag or use the one-time Load unpacked.
- **With Growser (default).** [Growser](https://growser.org) is the default
  browser of the webharvester tool for Claude Code (Windows, macOS, Linux). It
  ships the extension bundled and enables it with a single launch argument,
  `--enable-webharvester` — no unpacked-extension step, and it persists like a
  normal installed extension. This is the out-of-the-box path.

To set either up, run the repo's `setup.sh` (macOS/Linux) or `setup.ps1`
(Windows); `--measure` / `-Measure` installs Growser and regenerates these
guides from that browser.

## How to use

Reach for a capability by what the task needs, then open its reference for the
exact API and use note:

- **Act as the user in a page** — `scripting`, `userScripts`, `tabs`, `debugger`, `activeTab`.
- **Capture what is on screen** — `tabCapture`, `desktopCapture`, `pageCapture`, `favicon`.
- **Move or keep data** — `storage`, `unlimitedStorage`, `cookies`, `downloads`, `clipboardRead`/`clipboardWrite`.
- **Reach across the browser** — `tabGroups`, `sessions`, `history`, `bookmarks`, `sidePanel`, `webNavigation`.
- **Watch or wait** — `alarms`, `idle`, `webRequest`, `declarativeNetRequest`.
- **Reach local software or identity** — `nativeMessaging`, `identity`, `proxy`.

The two tables below list every capability the extension gets here and the ones
this browser/OS refuses.

## Working permissions (62)

| Permission | Namespace | Guide |
| --- | --- | --- |
| `accessibilityFeatures.modify` | `chrome.accessibilityFeatures` | [accessibilityFeatures-modify](references/accessibilityFeatures-modify.md) |
| `accessibilityFeatures.read` | `chrome.accessibilityFeatures` | [accessibilityFeatures-read](references/accessibilityFeatures-read.md) |
| `activeTab` | `capability` | [activeTab](references/activeTab.md) |
| `alarms` | `chrome.alarms` | [alarms](references/alarms.md) |
| `background` | `capability` | [background](references/background.md) |
| `bookmarks` | `chrome.bookmarks` | [bookmarks](references/bookmarks.md) |
| `browsingData` | `chrome.browsingData` | [browsingData](references/browsingData.md) |
| `clipboardRead` | `capability` | [clipboardRead](references/clipboardRead.md) |
| `clipboardWrite` | `capability` | [clipboardWrite](references/clipboardWrite.md) |
| `contentSettings` | `chrome.contentSettings` | [contentSettings](references/contentSettings.md) |
| `contextMenus` | `chrome.contextMenus` | [contextMenus](references/contextMenus.md) |
| `cookies` | `chrome.cookies` | [cookies](references/cookies.md) |
| `debugger` | `chrome.debugger` | [debugger](references/debugger.md) |
| `declarativeContent` | `chrome.declarativeContent` | [declarativeContent](references/declarativeContent.md) |
| `declarativeNetRequest` | `chrome.declarativeNetRequest` | [declarativeNetRequest](references/declarativeNetRequest.md) |
| `declarativeNetRequestFeedback` | `chrome.declarativeNetRequest` | [declarativeNetRequestFeedback](references/declarativeNetRequestFeedback.md) |
| `declarativeNetRequestWithHostAccess` | `capability` | [declarativeNetRequestWithHostAccess](references/declarativeNetRequestWithHostAccess.md) |
| `desktopCapture` | `chrome.desktopCapture` | [desktopCapture](references/desktopCapture.md) |
| `downloads` | `chrome.downloads` | [downloads](references/downloads.md) |
| `downloads.open` | `chrome.downloads` | [downloads-open](references/downloads-open.md) |
| `downloads.shelf` | `chrome.downloads` | [downloads-shelf](references/downloads-shelf.md) |
| `downloads.ui` | `chrome.downloads` | [downloads-ui](references/downloads-ui.md) |
| `favicon` | `capability` | [favicon](references/favicon.md) |
| `fontSettings` | `chrome.fontSettings` | [fontSettings](references/fontSettings.md) |
| `gcm` | `chrome.gcm` | [gcm](references/gcm.md) |
| `geolocation` | `capability` | [geolocation](references/geolocation.md) |
| `history` | `chrome.history` | [history](references/history.md) |
| `identity` | `chrome.identity` | [identity](references/identity.md) |
| `identity.email` | `capability` | [identity-email](references/identity-email.md) |
| `idle` | `chrome.idle` | [idle](references/idle.md) |
| `management` | `chrome.management` | [management](references/management.md) |
| `nativeMessaging` | `chrome.runtime` | [nativeMessaging](references/nativeMessaging.md) |
| `notifications` | `chrome.notifications` | [notifications](references/notifications.md) |
| `offscreen` | `chrome.offscreen` | [offscreen](references/offscreen.md) |
| `pageCapture` | `chrome.pageCapture` | [pageCapture](references/pageCapture.md) |
| `power` | `chrome.power` | [power](references/power.md) |
| `printerProvider` | `chrome.printerProvider` | [printerProvider](references/printerProvider.md) |
| `privacy` | `chrome.privacy` | [privacy](references/privacy.md) |
| `proxy` | `chrome.proxy` | [proxy](references/proxy.md) |
| `publicSuffix` | `chrome.publicSuffix` | [publicSuffix](references/publicSuffix.md) |
| `readingList` | `chrome.readingList` | [readingList](references/readingList.md) |
| `scripting` | `chrome.scripting` | [scripting](references/scripting.md) |
| `search` | `chrome.search` | [search](references/search.md) |
| `sessions` | `chrome.sessions` | [sessions](references/sessions.md) |
| `sidePanel` | `chrome.sidePanel` | [sidePanel](references/sidePanel.md) |
| `storage` | `chrome.storage` | [storage](references/storage.md) |
| `system.cpu` | `chrome.system.cpu` | [system-cpu](references/system-cpu.md) |
| `system.display` | `chrome.system.display` | [system-display](references/system-display.md) |
| `system.memory` | `chrome.system.memory` | [system-memory](references/system-memory.md) |
| `system.storage` | `chrome.system.storage` | [system-storage](references/system-storage.md) |
| `tabCapture` | `chrome.tabCapture` | [tabCapture](references/tabCapture.md) |
| `tabGroups` | `chrome.tabGroups` | [tabGroups](references/tabGroups.md) |
| `tabs` | `chrome.tabs` | [tabs](references/tabs.md) |
| `topSites` | `chrome.topSites` | [topSites](references/topSites.md) |
| `tts` | `chrome.tts` | [tts](references/tts.md) |
| `ttsEngine` | `chrome.ttsEngine` | [ttsEngine](references/ttsEngine.md) |
| `unlimitedStorage` | `capability` | [unlimitedStorage](references/unlimitedStorage.md) |
| `userScripts` | `chrome.userScripts` | [userScripts](references/userScripts.md) |
| `webAuthenticationProxy` | `chrome.webAuthenticationProxy` | [webAuthenticationProxy](references/webAuthenticationProxy.md) |
| `webNavigation` | `chrome.webNavigation` | [webNavigation](references/webNavigation.md) |
| `webRequest` | `chrome.webRequest` | [webRequest](references/webRequest.md) |
| `webRequestAuthProvider` | `chrome.webRequest` | [webRequestAuthProvider](references/webRequestAuthProvider.md) |

## Not granted here (31)

Declared by the full extension but refused by this browser/OS, so left out of
the shipped manifest. Regenerate for another browser with the webharvester
measurement flow.

| Permission | Reason | Detail |
| --- | --- | --- |
| `audio` | platform | chromeos |
| `certificateProvider` | platform | chromeos |
| `declarativeWebRequest` | channel | beta |
| `dns` | channel | dev |
| `documentScan` | platform | chromeos |
| `enterprise.deviceAttributes` | platform | chromeos |
| `enterprise.hardwarePlatform` | location | policy |
| `enterprise.kioskInput` | platform | chromeos |
| `enterprise.login` | platform | chromeos |
| `enterprise.networkingAttributes` | platform | chromeos |
| `enterprise.platformKeys` | platform | chromeos |
| `enterprise.webrtc` | unknown-permission | not in Chromium 153.0.8010.18 |
| `experimental` | command-line-switch | experimental-extension-apis |
| `experimentalActor` | command-line-switch | extension-actor-api |
| `experimentalAiData` | command-line-switch | extension-ai-data-collection |
| `fileBrowserHandler` | platform | chromeos |
| `fileSystemProvider` | platform | chromeos |
| `input` | platform | chromeos |
| `login` | platform | chromeos |
| `loginScreenStorage` | platform | chromeos |
| `loginState` | platform | chromeos |
| `omnibox.directInput` | channel | dev |
| `platformKeys` | platform | chromeos |
| `printing` | platform | chromeos |
| `printingMetrics` | platform | chromeos |
| `processes` | channel | dev |
| `system.network` | allowlist | 3 allowlisted ids |
| `systemLog` | platform | chromeos |
| `vpnProvider` | platform | chromeos |
| `wallpaper` | platform | chromeos |
| `webRequestBlocking` | max-manifest-version | 2 |
