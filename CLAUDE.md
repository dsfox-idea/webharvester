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
- `plugin/server/` (the `growser` MCP server: `web_search`, `web_fetch`) is hand-written and
  must stay dependency-free: Claude Code copies `plugin/` into its cache
  without `node_modules`. It must not import from `src/`.
- Sessions are routed to `web_search` / `web_fetch` by the server's
  `instructions` (put into every session's system prompt) and enforced by
  `plugin/hooks/` (PreToolUse denies `WebSearch` and `WebFetch`);
  `tests/static/plugin-routing.spec.ts` guards both.
- Code run in the page (`plugin/server/page-scripts.ts`) is serialised by
  `executeScript` from its own source: keep each function self-contained.
- Any change under `plugin/` needs a version bump in both
  `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`:
  installs from GitHub are cached by `version`, and `claude plugin update`
  compares only `version`. `package.json` is the extension's version; leave
  it alone. This machine's marketplace is this clone (a directory source):
  Claude Code runs the plugin straight from `plugin/` here (the server
  process is `node A:/dev/webharvester/plugin/server/main.ts`), so even
  uncommitted edits reach new sessions after a restart.
- Growser bundles the extension from a DEPS pin (growser#212): edits to
  `extension/` reach Growser only after the pin moves, so the MCP server must
  work with the extension code already shipped.

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
- The extension's MV3 worker stops after ~30 s idle and leaves `/json/list`.
  `ServiceWorker.enable` + `ServiceWorker.startWorker({scopeURL:
  'chrome-extension://<id>/'})` on any page target wakes it in milliseconds.
- `--remote-debugging-port` on the default profile is refused only under
  `GOOGLE_CHROME_BRANDING` (`remote_debugging_server.cc`); Growser allows it.
- DuckDuckGo answers a `fetch` from the extension worker with a human check
  (HTTP 202, "bots use DuckDuckGo too"); the same query in a real tab gets
  results. Never solve or work around such a check: leave it to the user.
- On Windows `chrome.windows.update({focused: true})` does not bring Growser
  in front of another app (foreground lock), yet `chrome.windows` still
  reports the window as focused. Check what the user sees with Win32
  `GetForegroundWindow`, never with the Chrome API.
- `chrome.webNavigation` reports a new tab's first navigation only when it
  commits (`onBeforeNavigate` arrives together with `onCommitted`). On this
  machine Growser never fails an unresolvable host: the tab stays `loading`
  for minutes with no events, although the system DNS answers NXDOMAIN. So
  `ExtensionTabs.open` catches fast failures via `onErrorOccurred` and relies
  on its timeout for the rest.
- A diagnostic `evaluate` that outlives the CDP call timeout (30 s) keeps
  running in the worker and can leave tabs open: keep diagnostics short and
  check the tab strip afterwards.
- On Windows `fs.existsSync` is false for a Microsoft Store app alias
  (`WindowsApps\growser.exe`; `stat` fails with EACCES); use `lstatSync`.
