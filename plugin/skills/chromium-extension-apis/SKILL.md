---
name: chromium-extension-apis
description: Reference for Chromium extension permissions that actually work on this machine — each permission's official API interface plus what it can be used for in the broadest sense, and how to run the webharvester extension (standalone, or via Growser's --enable-webharvester). Use when choosing, explaining, or reviewing Chromium/Chrome/Brave extension permissions, deciding which permission an automation needs, auditing what an extension could do, or setting up the webharvester browser.
---

# Chromium Extension APIs

One short guide per extension permission that a real browser here actually
grants, measured with the webharvester extension. Each guide has two parts:

- **Interface** — the official description, functions and events, taken from
  the Chromium API schema (`_permission_features.json` and the `*.json` /
  `*.idl` / `*.webidl` files developer.chrome.com is generated from), at
  Chromium revision `96bc3a02d46c85d7573e6f1f899e0dda8a092d47`.
- **What it's for (broad)** — an authored note on what the permission can do
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

Look up a permission in the table and open its reference file for the full
interface and use note. To pick a permission for a task, scan the "What it's
for" notes; to review an extension, read the guides for the permissions it
declares.

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
