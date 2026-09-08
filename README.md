# webharvester

A Manifest V3 Chromium extension that declares every permission a regular
extension can declare (93 names, derived from Chromium sources), full host
access (`<all_urls>`), and a content script on every URL and every frame.
A test suite measures which permissions the browser actually grants; the
ones it refuses are marked non-working (`catalog/non-working.json`) and left
out of the shipped manifest, so the loaded extension has no warnings.

## Two ways to use

- **On its own (manual).** Load `extension/` into any Chromium browser
  (chrome://extensions -> Developer mode -> Load unpacked, or launch with
  `--load-extension=extension`) and install the skill/plugin separately. Works
  anywhere, but you wire the pieces up yourself.
- **With Growser (default, automatic).** [Growser](https://growser.org) ships
  this extension bundled and turns it on with a single launch argument,
  `--enable-webharvester`. Growser is the default browser of the webharvester
  tool for Claude Code and is available for Windows, macOS and Linux, so this
  is the out-of-the-box path: no unpacked-extension step, and it survives
  restarts because the bundled extension is a normal installed one.

## Layout

| Path | Purpose |
| --- | --- |
| `extension/` | The unpacked extension. `probe.html` runs one probe per permission and shows a table. |
| `catalog/permissions.json` | Generated from Chromium main `_permission_features.json`; the manifest is built from it. |
| `catalog/non-working.json` | Permissions the target browser refused in a live run of the full manifest; excluded from the manifest and shown greyed on the probe page. |
| `catalog/versions/<version>.json` | Same catalog at the Chromium release tag of a browser the live tests ran against (fetched on first use). |
| `scripts/sync-catalog.ts` | Refreshes the catalog from Chromium main (or a given revision). |
| `scripts/build-manifest.ts` | Regenerates `extension/manifest.json` from the catalog. |
| `src/` | Catalog model, availability rules (a port of `SimpleFeature` checks), browser session for tests. |
| `tests/static/` | No browser: catalog rules, manifest/catalog sync, availability rules, extension id. |
| `tests/live/` | Loads the extension into a browser and checks granted permissions, API calls, content script. |
| `docs/superpowers/specs/` | Design spec. |
| `plugin/` | Claude Code plugin: one guide per working permission (interface + broad-use note), built by `npm run build-guides`. |

## Install

The plugin is static reference text; it needs no browser.

New user, no clone (macOS/Linux):

```sh
claude plugin marketplace add dsfox-idea/webharvester
claude plugin install web-harvester@webharvester
```

Or run the setup script from a clone:

```sh
git clone https://github.com/dsfox-idea/webharvester
cd webharvester
./setup.sh            # install the plugin
./setup.sh --measure  # also install Growser, add a launcher, regenerate guides
```

Windows (PowerShell):

```powershell
git clone https://github.com/dsfox-idea/webharvester
cd webharvester
./setup.ps1            # install the plugin
./setup.ps1 -Measure   # also install Growser from the Store and regenerate guides
```

`--measure` / `-Measure` re-measures which permissions your own browser grants
and rebuilds the guides. It installs Growser (the default browser of the
webharvester tool, for Windows, macOS and Linux) and writes a launcher that
starts it with `--enable-webharvester`, which enables the bundled extension.
For any other Chromium browser, use manual mode: load `extension/` from
chrome://extensions, or launch with `--load-extension=extension`.

## Commands

```sh
npm install
npm test                 # static tests
npm run test:live        # live tests in Playwright's bundled Chrome for Testing (headless)
HEADED=1 npm run test:live
npm run build-manifest -- --full   # manifest with all 93 names, for measuring a browser
npm run mark-non-working # test-results/probe-report.json -> catalog/non-working.json
npm run sync-catalog     # refresh catalog/permissions.json from Chromium main
npm run sync-catalog -- --version 151.0.7445.82   # catalog for one Chromium release
npm run build-manifest   # regenerate extension/manifest.json
npm run build-guides     # regenerate the Claude Code plugin from Chromium schemas + use notes
```

The live run writes `test-results/probe-report.json` and attaches the
chrome://extensions view of the extension (`extension-info.json`) to the
warnings test. After loading, the session switches on developer mode and the
per-extension "Allow User Scripts" toggle through `chrome.developerPrivate`
on chrome://extensions, because that is what unlocks `chrome.debugger`,
`chrome.userScripts` and Chromium's manifest warnings.

## Re-measuring for another browser

```sh
npm run build-manifest -- --full
CHROME_PATH=/Applications/Growser.app/Contents/MacOS/Growser HEADED=1 npm run test:live
npm run mark-non-working
npm run build-manifest
CHROME_PATH=/Applications/Growser.app/Contents/MacOS/Growser HEADED=1 npm run test:live   # expects zero warnings now
```

## Live tests against your own browser or profile

The extension is loaded through the DevTools protocol command
`Extensions.loadUnpacked`, which needs the browser to run with
`--enable-unsafe-extension-debugging`. Branded Google Chrome 137+ no longer
honours `--load-extension`, so this is the path that works everywhere.

Launch mode (the tests start the browser):

```sh
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
USER_DATA_DIR=/path/to/profile \
HEADED=1 npm run test:live
```

Attach mode (you start the browser, tests connect to it):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=/path/to/profile \
  --remote-debugging-port=9222 \
  --enable-unsafe-extension-debugging
CDP_URL=http://127.0.0.1:9222 CHANNEL=stable npm run test:live
```

If the browser was started without `--enable-unsafe-extension-debugging`,
load `extension/` by hand via chrome://extensions → Developer mode → Load
unpacked; the tests then only attach.

Environment variables:

| Variable | Meaning |
| --- | --- |
| `CHROME_PATH` | Browser binary. Default: Playwright's bundled Chrome for Testing. |
| `USER_DATA_DIR` | Profile directory. Default: a fresh one under `.playwright-profile/`. |
| `CDP_URL` | DevTools endpoint of a running browser; switches to attach mode. |
| `CHANNEL` | Overrides the measured channel (`unknown`, `canary`, `dev`, `beta`, `stable`). By default the channel is measured: the dev-channel-only API `system.storage.getAvailableCapacity` is present on dev/canary/unknown builds (Chromium, Chrome for Testing, developer builds of Brave-based browsers) and absent on beta/stable. |
| `HEADED` | `1` to show the browser window. |

## What the tests assert

- The manifest equals what `scripts/build-manifest.ts` produces from the catalog.
- The catalog contains no `*Private`, allowlist-only, internal, or unloadable names.
- Availability rules reproduce Chromium's `SimpleFeature` checks: platform,
  channel, command-line switch, feature flag, session type, allowlist,
  install location, manifest version bounds, behaviour dependencies.
- Live: the browser's Chromium version, executable path and command line are
  read from chrome://version; expectations use the catalog of that Chromium
  release, so a permission newer than the browser is expected to be reported
  as "Permission 'x' is unknown". The set of granted permissions equals the
  set the rules predict for the detected environment; every granted permission's API namespace exists;
  every granted permission survives a harmless call; all predicted-unavailable
  permissions are absent and Chromium's own manifest warnings name exactly
  those permissions; `<all_urls>` is granted; the content script runs in the
  top frame, a nested frame and an about:blank frame.

## Why some permissions are never granted here

Chromium keeps unavailable permissions as install warnings and drops them
(`permissions_parser.cc`). On macOS with Chrome for Testing that means:
ChromeOS-only APIs (`wallpaper`, `printing`, `platformKeys`, ...),
policy-only ones (`enterprise.hardwarePlatform`, `webRequestBlocking` in MV3),
flag-gated ones (`experimental*`, `omnibox.directInput`, `enterprise.webrtc`)
and MV2-only ones (`declarativeWebRequest`). Two names are excluded from the
manifest entirely because Chromium refuses to load the extension with them:
`devtools` (internal, granted via `devtools_page`) and `transientBackground`
(needs an MV2 event page).
