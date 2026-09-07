# webharvester — notes for Claude

MV3 Chromium extension declaring every declarable extension permission, plus
Playwright tests. Design spec: `docs/superpowers/specs/`. Usage: `README.md`.

## Workflow

- The permission list lives only in `catalog/permissions.json`, generated from
  Chromium sources by `npm run sync-catalog`; then `npm run build-manifest`.
  Never edit `extension/manifest.json` by hand (a static test compares it to
  the builder output).
- `catalog/non-working.json` is measured, not predicted: full manifest
  (`build-manifest -- --full`) -> live run in the target browser ->
  `mark-non-working` -> `build-manifest`. The shipped manifest excludes it and
  the live tests then expect zero manifest warnings.
- `npm test` (static, no browser) must pass before `npm run test:live`.
- Live expectations come from `catalog/versions/<chromium version>.json`
  (fetched from the release tag on first use, then committed); the manifest
  itself comes from main, so older browsers warn "Permission 'x' is unknown"
  for newer names and the tests expect exactly that.
- Live tests load the extension through CDP `Extensions.loadUnpacked`
  (`--enable-unsafe-extension-debugging`); `--load-extension` is dead in
  branded Chrome 137+. Playwright's default `--disable-extensions` must be
  dropped via `ignoreDefaultArgs`, otherwise the loaded extension stays disabled.
- Chromium facts used here were read from source, not docs: keep that habit
  (`permissions_parser.cc`, `simple_feature.cc`, `background_info.cc`,
  `extension_info_generator.cc`, `channel_info_mac.mm`).

- The `plugin/` skill is generated: `npm run build-guides` reads Chromium API
  schemas at the catalog revision and merges them with hand-written use notes
  in `src/permission-uses.ts`. Interface text is never hand-edited; use notes
  and `src/api-schema-map.ts` are. Validate with `claude plugin validate plugin`.

## Lessons

- Do not infer the release channel from Info.plist: Brave-based browsers map
  it their own way and any non-official build is Channel::UNKNOWN. The channel
  is measured in the browser (`src/channel-probe.ts`).

- Chrome API methods on `ChromeSetting`, `ContentSetting`, `StorageArea` must
  be called on their owner object; detached calls throw "Illegal invocation".
  `extension/probes/chrome-call.js` takes `(owner, method, ...args)`.
- Code inside `page.evaluate()` runs in the browser: helpers from the Node
  module scope are not available there; inline them.
- Chromium reports manifest warnings via `chrome.developerPrivate` only in
  developer mode, and as `manifestErrors` (error console) rather than
  `installWarnings` once developer mode is on.
