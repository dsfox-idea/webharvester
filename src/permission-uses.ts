/**
 * Author-written "what this permission is for, in the broadest sense" notes,
 * one per working permission. The official interface description comes from
 * Chromium schemas (see api-schema-map.ts); this is the part written by hand.
 */
export const permissionUses: Readonly<Record<string, string>> = {
  'accessibilityFeatures.read':
    'Read the on/off state of the browser accessibility features (spoken feedback, high contrast, sticky keys, autoclick, large cursor, caret highlight, and so on). Broadly: detect that a user relies on assistive settings and adapt the extension UI, gate features, or report accessibility posture across a fleet.',
  'accessibilityFeatures.modify':
    'Turn those same accessibility features on or off from the extension. Broadly: build one-click accessibility profiles, sync assistive settings across machines, let a caretaker or admin toggle features remotely, or automate accessibility testing setups.',
  activeTab:
    'A consent-free grant of host access and scripting to the tab the user just acted on, valid until they navigate away. Broadly: the least-privilege way to read or transform the current page on demand (clip it, extract data, fill a form, inject a tool) without asking for permanent all-sites access.',
  alarms:
    'Schedule wake-ups by delay or wall-clock time that survive the service worker going idle. Broadly: the heartbeat of any background automation, polling, periodic sync, cache expiry, reminder, or cron-like task in an MV3 extension.',
  background:
    'Keep the browser process (and the extension) alive early at login and late after the last window closes. Broadly: run an always-on local agent, a sync daemon, a message relay, or a watchdog that must not miss events while no window is open.',
  bookmarks:
    'Full read/write access to the bookmark tree. Broadly: bookmark managers, cross-device or cross-browser sync, taggers and deduplicators, read-later pipelines, and bulk import/export or reorganization tools.',
  browsingData:
    'Clear browsing data (history, cache, cookies, storage, downloads, form data, passwords) by type and time range. Broadly: privacy cleaners, "forget this site" buttons, kiosk/shared-machine reset between users, and test-harness state resets.',
  clipboardRead:
    'Read the system clipboard through the Clipboard API from extension pages. Broadly: paste-aware tools, snippet expanders, clipboard history and sync, and importers that pick up whatever the user copied elsewhere.',
  clipboardWrite:
    'Write to the system clipboard reliably, including from background contexts. Broadly: copy buttons, formatters and converters, share/export flows, and automations that hand data to other apps through paste.',
  contentSettings:
    'Override per-site content permissions (JavaScript, images, cookies, popups, camera/mic, location, notifications, plugins) that the browser would otherwise prompt for. Broadly: security and privacy hardening, per-site policy engines, and reproducible test environments.',
  contextMenus:
    'Add the extension\'s own items to the right-click menu, scoped to selection, links, images, pages, or specific URL patterns. Broadly: the main surface for turning "the thing under the cursor" into an action (search, send, translate, save, lookup).',
  cookies:
    'Read, write, and watch cookies for any host the extension has access to, across cookie stores. Broadly: session managers and account switchers, auth debugging, consent/tracking auditing, and moving a logged-in session between profiles or tools.',
  debugger:
    'Attach the Chrome DevTools Protocol to tabs, letting the extension drive the same low-level control DevTools uses. Broadly: deep automation and instrumentation, network and DOM interception beyond declarative APIs, performance/coverage capture, and headless-style scripting of real pages.',
  declarativeContent:
    'Run rules that show the action button or inject scripts when page conditions match, evaluated by the browser without host permissions or reading page content. Broadly: privacy-preserving "activate only on relevant pages" behavior.',
  declarativeNetRequest:
    'Block, redirect, or modify requests and headers via static/dynamic rulesets the browser enforces itself. Broadly: ad/tracker/content blockers, redirectors and rewriters, header injectors, and network policy that scales to tens of thousands of rules without a per-request callback.',
  declarativeNetRequestFeedback:
    'See which of your dynamic rules matched, and log rule matches to the DevTools console. Broadly: authoring, debugging, and auditing a blocking/redirect ruleset, and measuring what a policy actually catches.',
  declarativeNetRequestWithHostAccess:
    'The same request-modification power as declarativeNetRequest, but every rule action is gated on host permissions the user granted. Broadly: a ruleset engine that acts only where the user has opted in, e.g. per-site rewriters and header tools.',
  desktopCapture:
    'Prompt the user to pick a screen, window, or tab and hand back a media stream for it. Broadly: screen recorders, screenshot/annotation tools, remote support and screen sharing, and visual test capture.',
  downloads:
    'Programmatically start, search, pause, resume, cancel, and inspect downloads, and react to their lifecycle. Broadly: download managers, bulk/batch downloaders, "save all" and archiving tools, and pipelines that fetch generated files to disk.',
  'downloads.open':
    'Open a completed download in its associated application from the extension. Broadly: finish-and-launch flows where the downloaded file should immediately open (a report, an installer, media).',
  'downloads.shelf':
    'Show or hide the classic download shelf. Broadly: replace the built-in download UI with the extension\'s own, or keep a kiosk/presentation surface clean. (Superseded by downloads.ui.)',
  'downloads.ui':
    'Enable or disable the browser\'s download UI as a whole. Broadly: extensions that own the download experience end to end, or suppress native chrome during automation and demos.',
  favicon:
    'Fetch the browser\'s cached favicon for any page URL through the _favicon/ resource. Broadly: render authentic site icons in bookmark managers, tab/session UIs, history views, and dashboards without hitting the network.',
  fontSettings:
    'Read and set the browser\'s font families and sizes per generic family and script. Broadly: readability and accessibility tooling, theming, and enforcing typography defaults across a fleet.',
  gcm:
    'Register with Firebase Cloud Messaging and receive server-pushed messages in the extension. Broadly: real-time notifications, server-initiated sync and commands, and keeping a background agent in step with a backend without polling.',
  geolocation:
    'Use the geolocation API without the usual per-use prompt. Broadly: location-aware automation, region defaults, mapping and travel tools, and logging that would be too noisy if it prompted each time.',
  history:
    'Read and modify the browsing history: search visits, add or delete URLs, and watch changes. Broadly: history search and analytics, privacy scrubbing of specific entries, activity timelines, and export to external tools.',
  identity:
    'Run OAuth2 and get Google or web auth tokens through a managed flow, plus the user\'s account info. Broadly: sign the extension into Google or third-party APIs, back a synced account, and authorize server calls without hand-rolling the redirect dance.',
  'identity.email':
    'Expose the signed-in user\'s email through the identity API. Broadly: pre-fill sign-in, identify the user to a backend, and scope per-user data without a separate login.',
  idle:
    'Detect whether the machine is active, idle, or locked, with a configurable threshold. Broadly: pause or resume background work, presence and time-tracking, security auto-lock behavior, and scheduling heavy tasks for idle time.',
  management:
    'Enumerate installed extensions and apps and query/react to the extension\'s own install state and launch. Broadly: security and compliance inventory, conflict detection, enterprise self-management, and launcher/dashboard UIs.',
  nativeMessaging:
    'Exchange messages with a registered native host process on the machine. Broadly: the bridge from the browser to local software the web cannot reach: the filesystem, hardware, system tools, or a companion desktop app.',
  notifications:
    'Create rich system notifications (text, image, list, progress, buttons) and handle their interactions. Broadly: alerting, reminders, job-complete and error surfacing, and any push of information the user should see outside the current tab.',
  offscreen:
    'Create a hidden document so the extension can use DOM-only APIs (audio playback, canvas, clipboard, DOM parsing) that a service worker lacks. Broadly: the MV3 workaround for any background job that still needs a real DOM.',
  pageCapture:
    'Save a whole tab as a single MHTML archive. Broadly: full-fidelity page archiving, offline snapshots, evidence capture, and feeding complete pages into downstream processing.',
  power:
    'Ask the system to keep the display awake or just prevent sleep. Broadly: keep long downloads, uploads, playback, presentations, or monitoring dashboards running without the machine dozing off.',
  printerProvider:
    'Implement a printer: receive print jobs and report capabilities to the browser. Broadly: bridge the browser to cloud, virtual, or otherwise non-native printers and "print to" pipelines.',
  privacy:
    'Read and set browser privacy/security toggles (network prediction, WebRTC IP policy, Safe Browsing, autofill, referrers, and more). Broadly: privacy-hardening suites, security baselines, and enterprise policy enforcement from an extension.',
  proxy:
    'Read and control the browser\'s proxy configuration (fixed servers, PAC scripts, bypass lists) and observe proxy errors. Broadly: VPN/proxy front-ends, per-context routing, geo and testing setups, and privacy routing.',
  publicSuffix:
    'Query the Public Suffix List: get the registrable domain of a host and test known suffixes. Broadly: correct same-site grouping of cookies/history/tabs, phishing and look-alike-domain checks, and anything that must reason about "the real site" behind a hostname.',
  readingList:
    'Add, remove, update, and query entries in the browser\'s built-in reading list. Broadly: read-later workflows, cross-device queues, and bridges between the reading list and external note or bookmark systems.',
  scripting:
    'Inject and remove JavaScript and CSS in pages and register content scripts at runtime. Broadly: the core of page automation and augmentation in MV3: extract data, transform or restyle pages, drive flows, and light up tools in the page context.',
  search:
    'Run a query through the user\'s default search engine and put results in a tab, window, or the current tab. Broadly: search launchers, omnibox-style tools, and "search this" actions that respect the user\'s chosen engine.',
  sessions:
    'List and restore recently closed tabs/windows and open tabs on synced devices. Broadly: session managers, cross-device continuity, "reopen where I left off," and workspace restoration.',
  sidePanel:
    'Host the extension\'s own persistent UI in the browser side panel, globally or per tab. Broadly: a durable workspace that stays put across navigation: assistants, readers, notes, dashboards, and companions.',
  storage:
    'Extension-scoped key/value storage across local, sync, session, and managed areas, observable on change. Broadly: settings and state, cross-device sync of preferences, ephemeral in-memory state for the worker, and admin-pushed configuration.',
  'system.cpu':
    'Read CPU model, architecture, core count, and per-core usage. Broadly: performance monitoring and diagnostics, adapting workload to the machine, and fleet hardware inventory.',
  'system.display':
    'Enumerate displays with geometry, DPI, rotation, and work area. Broadly: multi-monitor window placement, presentation/kiosk layout, and screen-aware capture and UI.',
  'system.memory':
    'Read total and available physical memory. Broadly: performance monitoring, back-pressure on memory-heavy work, and capacity reporting.',
  'system.storage':
    'List storage volumes with capacity and type, watch attach/detach, and eject removable media. Broadly: storage dashboards, removable-media workflows, and space-aware download/caching decisions.',
  tabCapture:
    'Capture a tab\'s audio and video into a MediaStream after a user gesture. Broadly: tab recorders, in-page streaming and broadcasting, audio processing, and meeting/lecture capture.',
  tabGroups:
    'Read and modify tab groups: create, name, color, collapse, and move them. Broadly: workspace and session organizers, automatic grouping by site or task, and focus/declutter tools.',
  tabs:
    'Create, query, move, update, reload, and close tabs and windows, and read their metadata (with host access, their URLs). Broadly: the backbone of tab and window management, navigation automation, and multi-tab orchestration.',
  topSites:
    'Read the most-visited sites that back the new-tab page. Broadly: custom new-tab and launcher UIs, quick-access dashboards, and usage-aware shortcuts.',
  tts:
    'Speak text through the browser/system text-to-speech engines, with voice, rate, pitch, and event control. Broadly: read-aloud and accessibility, audio notifications, and hands-free or eyes-free interfaces.',
  ttsEngine:
    'Register the extension itself as a TTS voice provider that other extensions and pages can use. Broadly: ship custom, higher-quality, or cloud-backed voices and languages to the whole browser.',
  unlimitedStorage:
    'Remove the usual quota cap on chrome.storage.local, IndexedDB, Cache Storage, and OPFS. Broadly: offline-first apps, large local caches and datasets, media libraries, and anything that must persist a lot of data locally.',
  userScripts:
    'Register and run arbitrary user-provided scripts in page contexts, including the MAIN world, through a dedicated API. Broadly: userscript managers and any platform that lets users bring their own page-modifying code (subject to the developer-mode/user-scripts toggle).',
  webAuthenticationProxy:
    'Intercept and proxy the page\'s WebAuthn (passkey/security-key) calls through the extension. Broadly: remote-desktop and virtualization clients that forward authenticators, and enterprise credential brokering.',
  webNavigation:
    'Observe the full navigation lifecycle of frames (committed, DOM-ready, completed, history state, errors) with frame and document ids. Broadly: precise triggering, SPA-aware routing, analytics, and coordinating injection with page state.',
  webRequest:
    'Observe the request lifecycle across the browser (before send, headers, redirects, completion, errors) for hosts the extension can access. Broadly: monitoring, analytics, debugging, security inspection, and (with the auth-provider permission) answering auth challenges.',
  webRequestAuthProvider:
    'Answer HTTP authentication challenges (chrome.webRequest.onAuthRequired) asynchronously, including with credentials. Broadly: automatic proxy/site auth, SSO helpers, and unattended automation that must get past basic/digest/proxy auth.',
};
