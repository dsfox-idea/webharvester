# webharvester: all-permissions Chromium extension — design

Date: 2026-09-07

## Goal

A Manifest V3 Chromium extension that declares every permission the Chromium
extension platform lets a regular (non-allowlisted, non-component) extension
declare, plus full host access, plus a content script on every URL and frame.
An automated test suite proves which of those permissions are actually
granted at runtime and that the rest fail in the documented way.

## Source of truth for the permission list

Chromium sources, not docs:

- `extensions/common/api/_permission_features.json`
- `chrome/common/extensions/api/_permission_features.json`
- `extensions/common/permissions/extensions_api_permissions.cc`
- `chrome/common/extensions/permissions/chrome_api_permissions.cc`

Selection rule (implemented by `scripts/sync-catalog.ts`):

1. Take every feature name from both `_permission_features.json` files.
2. Keep only alternatives whose `extension_types` contains `"extension"`.
3. Drop names ending in `Private` or containing `Private.` (component-only).
4. Drop names whose every remaining alternative requires an `allowlist`
   (Google-internal ids; can never be granted to us).
5. Drop feature-only names that are not API permissions (`plugin`, `runtime`):
   verified against the two `*_api_permissions.cc` tables.
6. Drop `APIPermissionInfo::kFlagInternal` names (`devtools`, ...): the
   manifest parser rejects them (`kDisallowInternalPermissions`); `devtools`
   is granted only through the `devtools_page` key.
7. Drop permissions that make Chromium refuse the manifest outright:
   `transientBackground` needs an MV2 event page (`background_info.cc`,
   `kTransientBackgroundConflictsWithPersistentBackground`); with an MV3
   service worker the extension does not load at all.

Result: 93 declarable permission names, stored in `catalog/permissions.json`
together with the raw availability alternatives and the Chromium revision.

## Version skew

The manifest is built from Chromium main, so it can name permissions an
older browser does not know (e.g. `publicSuffix` on Chromium 151). Chromium
then warns "Permission 'x' is unknown." and ignores it. The live tests read
the browser's Chromium version from chrome://version and build expectations
from the catalog at that release tag (`catalog/versions/<version>.json`,
fetched from `refs/tags/<version>` on first use); names missing there are
expected unavailable with reason `unknown-permission`.

## Runtime behaviour of unavailable permissions (verified in source)

`extensions/common/manifest_handlers/permissions_parser.cc`, `ParseHelper`:
a declared permission whose feature is not available for the current
platform / channel / manifest version / install location is removed from
the granted set and reported as an install warning. The extension still
loads. Unknown names produce a "malformed pattern" warning in MV3.

Therefore the manifest declares all 95 names and the tests compute, per
permission, an expected status for the environment the tests run in:

- `available`
- `platform` (e.g. ChromeOS-only)
- `channel` (dev/beta/canary only)
- `manifest-version` (MV2-only)
- `location` (policy / component only)
- `flag` (needs a command-line switch or feature flag)

## Components

```
extension/
  manifest.json      generated from the catalog by scripts/build-manifest.ts
  background.js      service worker; installs probe runner, logs
  probe.html/js      in-extension probe UI + window.__probeRunner for tests
  probes/            one Probe class per permission (namespace + harmless call)
  content.js         content script on <all_urls>, all frames; marks the frame
catalog/
  permissions.json   generated; the only permission list in the repo
scripts/
  sync-catalog.ts    fetch Chromium sources -> catalog
  build-manifest.ts  catalog -> extension/manifest.json
src/
  catalog.ts         PermissionCatalog (load/parse)
  catalog-repository.ts  main catalog + per-Chromium-version catalogs
  gitiles.ts         Chromium source fetcher
  version-page.ts    chrome://version reader (version, executable, switches)
  expected-permissions.ts  expectations for one browser
  availability.ts    AvailabilityRules: expected status per environment
  extension-id.ts    ExtensionIdentity: id from manifest.key
  browser-session.ts BrowserSession: launch (flags) or attach (CDP)
tests/
  static/*.spec.ts   manifest == catalog, availability rules, extension id
  live/*.spec.ts     permissions granted, probes, content script injection
```

## Live test modes

The extension is loaded with the CDP command `Extensions.loadUnpacked`
(browser started with `--enable-unsafe-extension-debugging`), which works in
Chromium, Chrome for Testing and branded Google Chrome >= 137 (the latter
ignores `--load-extension`). Chromium answers with the extension id or the
exact manifest error. Playwright's default `--disable-extensions` is dropped.

- **launch**: Playwright launches the browser. Optional `USER_DATA_DIR` for a
  user-provided profile, optional `CHROME_PATH` for a specific binary.
  Default: Playwright's bundled Chrome for Testing, headless.
- **attach**: `CDP_URL` points at a running browser started with
  `--remote-debugging-port` (+ `--enable-unsafe-extension-debugging`, else
  the extension must be loaded by hand via "Load unpacked").

After loading, the session enables developer mode and the per-extension
"Allow User Scripts" toggle through `chrome.developerPrivate` on
chrome://extensions: developer mode unlocks `chrome.debugger` and makes
Chromium report manifest warnings (`extension_info_generator.cc`), the
toggle unlocks `chrome.userScripts`.

The manifest carries a fixed `key`, so the extension id is stable and both
modes can open `chrome-extension://<id>/probe.html`.

## Testing policy

- Static tests run on every change (no browser).
- Live tests assert: set of granted permissions == expected `available`
  set; every available permission's probe passes (namespace present, harmless
  call succeeds); every unavailable one is not granted, and Chromium's own
  manifest warnings name exactly the unavailable set; content script present
  in the top frame, a nested http frame and an about:blank frame.
- Probes never do destructive or prompting calls (no clipboard writes, no
  geolocation prompts, no downloads, no keep-awake).

## Out of scope

Manifest capabilities that are not permissions (devtools_page, side_panel,
omnibox, tts_engine, chrome_url_overrides, commands, externally_connectable).
Optional permissions (everything is required).
