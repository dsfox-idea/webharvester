# webharvester — notes for Claude

MV3 Chromium extension declaring every declarable extension permission, plus
Playwright tests. Design spec: `docs/superpowers/specs/`. Usage: `README.md`.

## Workflow

- The permission list lives only in `catalog/permissions.json`, generated from
  Chromium sources by `npm run sync-catalog`; then `npm run build-manifest`.
  Never edit `extension/manifest.json` by hand (a static test compares it to
  the builder output).
- `npm test` (static, no browser) must pass before `npm run test:live`.
- Live tests load the extension through CDP `Extensions.loadUnpacked`
  (`--enable-unsafe-extension-debugging`); `--load-extension` is dead in
  branded Chrome 137+. Playwright's default `--disable-extensions` must be
  dropped via `ignoreDefaultArgs`, otherwise the loaded extension stays disabled.
- Chromium facts used here were read from source, not docs: keep that habit
  (`permissions_parser.cc`, `simple_feature.cc`, `background_info.cc`,
  `extension_info_generator.cc`, `channel_info_mac.mm`).

## Lessons

- Chrome API methods on `ChromeSetting`, `ContentSetting`, `StorageArea` must
  be called on their owner object; detached calls throw "Illegal invocation".
  `extension/probes/chrome-call.js` takes `(owner, method, ...args)`.
- Code inside `page.evaluate()` runs in the browser: helpers from the Node
  module scope are not available there; inline them.
- Chromium reports manifest warnings via `chrome.developerPrivate` only in
  developer mode, and as `manifestErrors` (error console) rather than
  `installWarnings` once developer mode is on.
