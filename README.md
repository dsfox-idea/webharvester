# webharvester

A Manifest V3 Chromium extension that declares every permission a regular
extension can declare (93 names, derived from Chromium sources), full host
access (`<all_urls>`), and a content script on every URL and every frame.
A test suite proves which permissions the browser actually grants.

## Layout

| Path | Purpose |
| --- | --- |
| `extension/` | The unpacked extension. `probe.html` runs one probe per permission and shows a table. |
| `catalog/permissions.json` | Generated from Chromium `_permission_features.json`; the only permission list in the repo. |
| `scripts/sync-catalog.ts` | Refreshes the catalog from Chromium main (or a given revision). |
| `scripts/build-manifest.ts` | Regenerates `extension/manifest.json` from the catalog. |
| `src/` | Catalog model, availability rules (a port of `SimpleFeature` checks), browser session for tests. |
| `tests/static/` | No browser: catalog rules, manifest/catalog sync, availability rules, extension id. |
| `tests/live/` | Loads the extension into a browser and checks granted permissions, API calls, content script. |
| `docs/superpowers/specs/` | Design spec. |

## Commands

```sh
npm install
npm test                 # static tests
npm run test:live        # live tests in Playwright's bundled Chrome for Testing (headless)
HEADED=1 npm run test:live
npm run sync-catalog     # refresh catalog/permissions.json from Chromium main
npm run build-manifest   # regenerate extension/manifest.json
```

The live run attaches `probe-report.json` to the first test (see
`playwright-report/` or `test-results/`).

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
| `CHANNEL` | `unknown`, `canary`, `dev`, `beta`, `stable`. On macOS the channel is read from the app bundle's `Info.plist` in launch mode; attach mode assumes `stable` unless set. |
| `HEADED` | `1` to show the browser window. |

## What the tests assert

- The manifest equals what `scripts/build-manifest.ts` produces from the catalog.
- The catalog contains no `*Private`, allowlist-only, internal, or unloadable names.
- Availability rules reproduce Chromium's `SimpleFeature` checks: platform,
  channel, command-line switch, feature flag, session type, allowlist,
  install location, manifest version bounds, behaviour dependencies.
- Live: the set of granted permissions equals the set the rules predict for
  the detected environment; every granted permission's API namespace exists
  (`debugger` and `userScripts` may need developer mode, reported as
  annotations); every granted permission survives a harmless call; all
  predicted-unavailable permissions are absent; `<all_urls>` is granted; the
  content script runs in the top frame, a nested frame and an about:blank frame.

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
