import { Probe } from './probe.js';
import { chromeCall } from './chrome-call.js';

const count = (items, noun) => `${items.length} ${noun}`;
const summarize = (value) => {
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};
const typeName = (value, label) => {
  if (value === undefined) throw new Error(`${label} is undefined`);
  return `${label} is ${typeof value}`;
};
const permissionState = async (name) => `${name}: ${(await navigator.permissions.query({ name })).state}`;
const ownTabId = async () => (await chromeCall(chrome.tabs, 'getCurrent')).id;

/**
 * Per-permission probe definitions. `namespace` is the chrome.* path the
 * permission unlocks (omitted for capability-only permissions), `conditional`
 * explains a namespace that can be absent even when the permission is
 * granted, `exercise` is a harmless, non-prompting call.
 */
const definitions = {
  'accessibilityFeatures.modify': { namespace: 'accessibilityFeatures' },
  'accessibilityFeatures.read': {
    namespace: 'accessibilityFeatures',
    exercise: async () => summarize(await chromeCall(chrome.accessibilityFeatures.animationPolicy, 'get', {})),
  },
  activeTab: {},
  alarms: { namespace: 'alarms', exercise: async () => count(await chromeCall(chrome.alarms, 'getAll'), 'alarms') },
  audio: { namespace: 'audio' },
  background: {},
  bookmarks: { namespace: 'bookmarks', exercise: async () => count(await chromeCall(chrome.bookmarks, 'getTree'), 'roots') },
  browsingData: {
    namespace: 'browsingData',
    exercise: async () => summarize(Object.keys(await chromeCall(chrome.browsingData, 'settings'))),
  },
  certificateProvider: { namespace: 'certificateProvider' },
  clipboardRead: { exercise: () => permissionState('clipboard-read') },
  clipboardWrite: { exercise: () => permissionState('clipboard-write') },
  contentSettings: {
    namespace: 'contentSettings',
    exercise: async () =>
      `javascript for example.com: ${(await chromeCall(chrome.contentSettings.javascript, 'get', { primaryUrl: 'https://example.com/' })).setting}`,
  },
  contextMenus: {
    namespace: 'contextMenus',
    exercise: async () => {
      await chromeCall(chrome.contextMenus, 'removeAll');
      return 'removeAll ok';
    },
  },
  cookies: { namespace: 'cookies', exercise: async () => count(await chromeCall(chrome.cookies, 'getAll', {}), 'cookies') },
  debugger: {
    namespace: 'debugger',
    conditional: 'developer mode',
    exercise: async () => count(await chromeCall(chrome.debugger, 'getTargets'), 'targets'),
  },
  declarativeContent: {
    namespace: 'declarativeContent',
    exercise: () => typeName(chrome.declarativeContent.onPageChanged, 'onPageChanged'),
  },
  declarativeNetRequest: {
    namespace: 'declarativeNetRequest',
    exercise: async () => count(await chromeCall(chrome.declarativeNetRequest, 'getDynamicRules'), 'dynamic rules'),
  },
  declarativeNetRequestFeedback: {
    namespace: 'declarativeNetRequest',
    exercise: async () =>
      count((await chromeCall(chrome.declarativeNetRequest, 'getMatchedRules', {})).rulesMatchedInfo, 'matched rules'),
  },
  declarativeNetRequestWithHostAccess: { namespace: 'declarativeNetRequest' },
  declarativeWebRequest: { namespace: 'declarativeWebRequest' },
  desktopCapture: { namespace: 'desktopCapture', exercise: () => typeName(chrome.desktopCapture.chooseDesktopMedia, 'chooseDesktopMedia') },
  devtools: {}, // chrome.devtools exists only in devtools contexts
  dns: { namespace: 'dns', exercise: async () => summarize(await chromeCall(chrome.dns, 'resolve', 'localhost')) },
  documentScan: { namespace: 'documentScan' },
  downloads: { namespace: 'downloads', exercise: async () => count(await chromeCall(chrome.downloads, 'search', { limit: 1 }), 'downloads') },
  'downloads.open': { namespace: 'downloads', exercise: () => typeName(chrome.downloads.open, 'downloads.open') },
  'downloads.shelf': { namespace: 'downloads' },
  'downloads.ui': { namespace: 'downloads', exercise: () => typeName(chrome.downloads.setUiOptions, 'downloads.setUiOptions') },
  'enterprise.deviceAttributes': { namespace: 'enterprise.deviceAttributes' },
  'enterprise.hardwarePlatform': { namespace: 'enterprise.hardwarePlatform' },
  'enterprise.kioskInput': { namespace: 'enterprise.kioskInput' },
  'enterprise.login': { namespace: 'enterprise.login' },
  'enterprise.networkingAttributes': { namespace: 'enterprise.networkingAttributes' },
  'enterprise.platformKeys': { namespace: 'enterprise.platformKeys' },
  'enterprise.webrtc': { namespace: 'enterprise.webrtc' },
  experimental: {},
  experimentalActor: { namespace: 'experimentalActor' },
  experimentalAiData: { namespace: 'experimentalAiData' },
  favicon: {
    exercise: async () => {
      const response = await fetch(chrome.runtime.getURL('/_favicon/?pageUrl=https://example.com/&size=16'));
      if (!response.ok) throw new Error(`_favicon responded ${response.status}`);
      return `_favicon ${response.status} ${response.headers.get('content-type')}`;
    },
  },
  fileBrowserHandler: { namespace: 'fileBrowserHandler' },
  fileSystemProvider: { namespace: 'fileSystemProvider' },
  fontSettings: { namespace: 'fontSettings', exercise: async () => count(await chromeCall(chrome.fontSettings, 'getFontList'), 'fonts') },
  gcm: { namespace: 'gcm', exercise: () => `MAX_MESSAGE_SIZE=${chrome.gcm.MAX_MESSAGE_SIZE}` },
  geolocation: { exercise: () => permissionState('geolocation') },
  history: {
    namespace: 'history',
    exercise: async () => count(await chromeCall(chrome.history, 'search', { text: '', maxResults: 1 }), 'history items'),
  },
  identity: { namespace: 'identity', exercise: async () => summarize(await chromeCall(chrome.identity, 'getProfileUserInfo')) },
  'identity.email': { namespace: 'identity' },
  idle: { namespace: 'idle', exercise: async () => `state ${await chromeCall(chrome.idle, 'queryState', 60)}` },
  input: { namespace: 'input' },
  login: { namespace: 'login' },
  loginScreenStorage: { namespace: 'loginScreenStorage' },
  loginState: { namespace: 'loginState' },
  management: {
    namespace: 'management',
    exercise: async () => `installType ${(await chromeCall(chrome.management, 'getSelf')).installType}`,
  },
  nativeMessaging: { exercise: () => typeName(chrome.runtime.connectNative, 'runtime.connectNative') },
  notifications: {
    namespace: 'notifications',
    exercise: async () => count(Object.keys(await chromeCall(chrome.notifications, 'getAll')), 'notifications'),
  },
  offscreen: { namespace: 'offscreen', exercise: async () => `hasDocument ${await chromeCall(chrome.offscreen, 'hasDocument')}` },
  'omnibox.directInput': {},
  pageCapture: { namespace: 'pageCapture', exercise: () => typeName(chrome.pageCapture.saveAsMHTML, 'saveAsMHTML') },
  platformKeys: { namespace: 'platformKeys' },
  power: { namespace: 'power', exercise: () => typeName(chrome.power.requestKeepAwake, 'requestKeepAwake') },
  printerProvider: {
    namespace: 'printerProvider',
    exercise: () => typeName(chrome.printerProvider.onGetPrintersRequested, 'onGetPrintersRequested'),
  },
  printing: { namespace: 'printing' },
  printingMetrics: { namespace: 'printingMetrics' },
  privacy: {
    namespace: 'privacy',
    exercise: async () =>
      `webRTCIPHandlingPolicy ${(await chromeCall(chrome.privacy.network.webRTCIPHandlingPolicy, 'get', {})).value}`,
  },
  processes: {
    namespace: 'processes',
    exercise: async () => count(Object.keys(await chromeCall(chrome.processes, 'getProcessInfo', [], false)), 'processes'),
  },
  proxy: {
    namespace: 'proxy',
    exercise: async () => `levelOfControl ${(await chromeCall(chrome.proxy.settings, 'get', {})).levelOfControl}`,
  },
  publicSuffix: { namespace: 'publicSuffix', exercise: () => summarize(Object.keys(chrome.publicSuffix)) },
  readingList: { namespace: 'readingList', exercise: async () => count(await chromeCall(chrome.readingList, 'query', {}), 'entries') },
  scripting: {
    namespace: 'scripting',
    exercise: async () => count(await chromeCall(chrome.scripting, 'getRegisteredContentScripts'), 'registered scripts'),
  },
  search: { namespace: 'search', exercise: () => typeName(chrome.search.query, 'search.query') },
  sessions: {
    namespace: 'sessions',
    exercise: async () => count(await chromeCall(chrome.sessions, 'getRecentlyClosed', { maxResults: 1 }), 'recently closed'),
  },
  sidePanel: { namespace: 'sidePanel', exercise: async () => summarize(await chromeCall(chrome.sidePanel, 'getOptions', {})) },
  storage: {
    namespace: 'storage',
    exercise: async () => {
      await chromeCall(chrome.storage.local, 'set', { lastProbeAt: Date.now() });
      return summarize(Object.keys(await chromeCall(chrome.storage.local, 'get', null)));
    },
  },
  'system.cpu': { namespace: 'system.cpu', exercise: async () => (await chromeCall(chrome.system.cpu, 'getInfo')).modelName },
  'system.display': {
    namespace: 'system.display',
    exercise: async () => count(await chromeCall(chrome.system.display, 'getInfo'), 'displays'),
  },
  'system.memory': {
    namespace: 'system.memory',
    exercise: async () => `capacity ${(await chromeCall(chrome.system.memory, 'getInfo')).capacity}`,
  },
  'system.network': {
    namespace: 'system.network',
    exercise: async () => count(await chromeCall(chrome.system.network, 'getNetworkInterfaces'), 'interfaces'),
  },
  'system.storage': {
    namespace: 'system.storage',
    exercise: async () => count(await chromeCall(chrome.system.storage, 'getInfo'), 'volumes'),
  },
  systemLog: { namespace: 'systemLog' },
  tabCapture: {
    namespace: 'tabCapture',
    exercise: async () => count(await chromeCall(chrome.tabCapture, 'getCapturedTabs'), 'captured tabs'),
  },
  tabGroups: { namespace: 'tabGroups', exercise: async () => count(await chromeCall(chrome.tabGroups, 'query', {}), 'groups') },
  tabs: {
    namespace: 'tabs',
    exercise: async () => {
      const tabs = await chromeCall(chrome.tabs, 'query', {});
      const withUrl = tabs.filter((tab) => typeof tab.url === 'string' && tab.url.length > 0);
      if (withUrl.length === 0) throw new Error('no tab exposes its url: host access missing');
      return `${tabs.length} tabs, ${withUrl.length} with url`;
    },
  },
  topSites: { namespace: 'topSites', exercise: async () => count(await chromeCall(chrome.topSites, 'get'), 'top sites') },
  transientBackground: {},
  tts: { namespace: 'tts', exercise: async () => count(await chromeCall(chrome.tts, 'getVoices'), 'voices') },
  ttsEngine: { namespace: 'ttsEngine', exercise: () => typeName(chrome.ttsEngine.onSpeak, 'ttsEngine.onSpeak') },
  unlimitedStorage: { exercise: async () => `quota ${(await navigator.storage.estimate()).quota}` },
  userScripts: {
    namespace: 'userScripts',
    conditional: 'developer mode or the per-extension "Allow User Scripts" toggle',
    exercise: async () => count(await chromeCall(chrome.userScripts, 'getScripts'), 'user scripts'),
  },
  vpnProvider: { namespace: 'vpnProvider' },
  wallpaper: { namespace: 'wallpaper' },
  webAuthenticationProxy: {
    namespace: 'webAuthenticationProxy',
    exercise: () => typeName(chrome.webAuthenticationProxy.attach, 'webAuthenticationProxy.attach'),
  },
  webNavigation: {
    namespace: 'webNavigation',
    exercise: async () =>
      count(await chromeCall(chrome.webNavigation, 'getAllFrames', { tabId: await ownTabId() }), 'frames in own tab'),
  },
  webRequest: {
    namespace: 'webRequest',
    exercise: async () => {
      await chromeCall(chrome.webRequest, 'handlerBehaviorChanged');
      return 'handlerBehaviorChanged ok';
    },
  },
  webRequestAuthProvider: { namespace: 'webRequest', exercise: () => typeName(chrome.webRequest.onAuthRequired, 'onAuthRequired') },
  webRequestBlocking: { namespace: 'webRequest' },
};

/** Builds one Probe per declared manifest permission; undefined names get a capability-only probe. */
export class ProbeRegistry {
  static forPermissions(permissions) {
    return permissions.map((permission) => new Probe(permission, definitions[permission] ?? {}));
  }

  static definedPermissions() {
    return Object.keys(definitions);
  }
}
