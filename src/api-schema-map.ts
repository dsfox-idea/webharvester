/**
 * Where each permission's official description lives in the Chromium tree
 * (the files developer.chrome.com is generated from). Permissions without an
 * API namespace carry the official text from
 * developer.chrome.com/docs/extensions/reference/permissions-list instead.
 */
export interface SchemaSource {
  permission: string;
  namespace: string;
  file: string;
  /** Restrict to these functions (e.g. nativeMessaging owns two runtime functions). */
  only?: string[];
  /** Official text to use instead of the namespace description. */
  descriptionOverride?: string;
}

export interface CapabilitySource {
  permission: string;
  capability: string;
}

export type PermissionSource = SchemaSource | CapabilitySource;

const chrome = (name: string) => `chrome/common/extensions/api/${name}`;
const ext = (name: string) => `extensions/common/api/${name}`;

export const permissionSources: readonly PermissionSource[] = [
  { permission: 'accessibilityFeatures.modify', namespace: 'accessibilityFeatures', file: chrome('accessibility_features.json'), descriptionOverride: 'Lets extensions modify accessibility feature states when using the chrome.accessibilityFeatures API.' },
  { permission: 'accessibilityFeatures.read', namespace: 'accessibilityFeatures', file: chrome('accessibility_features.json'), descriptionOverride: 'Lets extensions read accessibility states when using the chrome.accessibilityFeatures API.' },
  { permission: 'activeTab', capability: 'Gives temporary access to the active tab through a user gesture.' },
  { permission: 'alarms', namespace: 'alarms', file: ext('alarms.webidl') },
  { permission: 'background', capability: 'Makes Chrome start up early (as soon as the user logs into their computer, before they launch Chrome), and shut down late (even after its last window is closed, until the user explicitly quits Chrome).' },
  { permission: 'bookmarks', namespace: 'bookmarks', file: chrome('bookmarks.json') },
  { permission: 'browsingData', namespace: 'browsingData', file: chrome('browsing_data.json') },
  { permission: 'clipboardRead', capability: 'Lets the extension paste items from the clipboard using the web platform Clipboard API.' },
  { permission: 'clipboardWrite', capability: 'Lets the extension cut and copy items to the clipboard using the web platform Clipboard API.' },
  { permission: 'contentSettings', namespace: 'contentSettings', file: chrome('content_settings.json') },
  { permission: 'contextMenus', namespace: 'contextMenus', file: chrome('context_menus.json') },
  { permission: 'cookies', namespace: 'cookies', file: chrome('cookies.json') },
  { permission: 'debugger', namespace: 'debugger', file: chrome('debugger.json') },
  { permission: 'declarativeContent', namespace: 'declarativeContent', file: chrome('declarative_content.json') },
  { permission: 'declarativeNetRequest', namespace: 'declarativeNetRequest', file: ext('declarative_net_request.webidl') },
  { permission: 'declarativeNetRequestFeedback', namespace: 'declarativeNetRequest', file: ext('declarative_net_request.webidl'), only: ['getMatchedRules', 'onRuleMatchedDebug'], descriptionOverride: 'Gives permission to write errors and warnings to the DevTools console when using the chrome.declarativeNetRequest API.' },
  { permission: 'declarativeNetRequestWithHostAccess', capability: 'Gives access to the chrome.declarativeNetRequest API but requires host permissions for all actions.' },
  { permission: 'desktopCapture', namespace: 'desktopCapture', file: chrome('desktop_capture.json') },
  { permission: 'downloads', namespace: 'downloads', file: chrome('downloads.webidl') },
  { permission: 'downloads.open', namespace: 'downloads', file: chrome('downloads.webidl'), only: ['open'], descriptionOverride: 'Allows the use of chrome.downloads.open().' },
  { permission: 'downloads.shelf', namespace: 'downloads', file: chrome('downloads.webidl'), only: ['setShelfEnabled'], descriptionOverride: 'Allows the use of chrome.downloads.setShelfEnabled() (deprecated in favour of downloads.ui).' },
  { permission: 'downloads.ui', namespace: 'downloads', file: chrome('downloads.webidl'), only: ['setUiOptions'], descriptionOverride: 'Allows the use of chrome.downloads.setUiOptions().' },
  { permission: 'favicon', capability: 'Grants access to the Favicon API: chrome-extension://<id>/_favicon/?pageUrl=<url>&size=<px> returns the cached favicon of any page.' },
  { permission: 'fontSettings', namespace: 'fontSettings', file: chrome('font_settings.json') },
  { permission: 'gcm', namespace: 'gcm', file: chrome('gcm.json') },
  { permission: 'geolocation', capability: 'Allows the extension to use the geolocation API without prompting the user for permission.' },
  { permission: 'history', namespace: 'history', file: chrome('history.json') },
  { permission: 'identity', namespace: 'identity', file: chrome('identity.webidl') },
  { permission: 'identity.email', capability: "Gives access to the user's email address through the chrome.identity API." },
  { permission: 'idle', namespace: 'idle', file: ext('idle.json') },
  { permission: 'management', namespace: 'management', file: ext('management.json') },
  { permission: 'nativeMessaging', namespace: 'runtime', file: ext('runtime.json'), only: ['connectNative', 'sendNativeMessage'], descriptionOverride: 'Gives access to the native messaging API: chrome.runtime.connectNative() and chrome.runtime.sendNativeMessage() talk to a registered native host process.' },
  { permission: 'notifications', namespace: 'notifications', file: chrome('notifications.webidl') },
  { permission: 'offscreen', namespace: 'offscreen', file: ext('offscreen.webidl') },
  { permission: 'pageCapture', namespace: 'pageCapture', file: chrome('page_capture.json') },
  { permission: 'power', namespace: 'power', file: ext('power.webidl') },
  { permission: 'printerProvider', namespace: 'printerProvider', file: ext('printer_provider.webidl') },
  { permission: 'privacy', namespace: 'privacy', file: chrome('privacy.json') },
  { permission: 'proxy', namespace: 'proxy', file: ext('proxy.json') },
  { permission: 'publicSuffix', namespace: 'publicSuffix', file: ext('public_suffix.webidl') },
  { permission: 'readingList', namespace: 'readingList', file: chrome('reading_list.webidl') },
  { permission: 'scripting', namespace: 'scripting', file: ext('scripting.idl') },
  { permission: 'search', namespace: 'search', file: chrome('search.idl') },
  { permission: 'sessions', namespace: 'sessions', file: chrome('sessions.json') },
  { permission: 'sidePanel', namespace: 'sidePanel', file: chrome('side_panel.idl') },
  { permission: 'storage', namespace: 'storage', file: ext('storage.json') },
  { permission: 'system.cpu', namespace: 'system.cpu', file: ext('system_cpu.webidl') },
  { permission: 'system.display', namespace: 'system.display', file: ext('system_display.webidl') },
  { permission: 'system.memory', namespace: 'system.memory', file: ext('system_memory.webidl') },
  { permission: 'system.storage', namespace: 'system.storage', file: ext('system_storage.webidl') },
  { permission: 'tabCapture', namespace: 'tabCapture', file: chrome('tab_capture.idl') },
  { permission: 'tabGroups', namespace: 'tabGroups', file: chrome('tab_groups.json') },
  { permission: 'tabs', namespace: 'tabs', file: chrome('tabs.json') },
  { permission: 'topSites', namespace: 'topSites', file: chrome('top_sites.json') },
  { permission: 'tts', namespace: 'tts', file: chrome('tts.json') },
  { permission: 'ttsEngine', namespace: 'ttsEngine', file: chrome('tts_engine.json') },
  { permission: 'unlimitedStorage', capability: 'Provides an unlimited quota for chrome.storage.local, IndexedDB, Cache Storage, and Origin Private File System.' },
  { permission: 'userScripts', namespace: 'userScripts', file: ext('user_scripts.webidl') },
  { permission: 'webAuthenticationProxy', namespace: 'webAuthenticationProxy', file: chrome('web_authentication_proxy.webidl') },
  { permission: 'webNavigation', namespace: 'webNavigation', file: chrome('web_navigation.json') },
  { permission: 'webRequest', namespace: 'webRequest', file: ext('web_request.json') },
  { permission: 'webRequestAuthProvider', namespace: 'webRequest', file: ext('web_request.json'), only: ['onAuthRequired'], descriptionOverride: 'Allows an MV3 extension to answer chrome.webRequest.onAuthRequired asynchronously with credentials (the only blocking-style webRequest handler still available without policy installation).' },
];

export class PermissionSources {
  static byPermission(permission: string): PermissionSource {
    const found = permissionSources.find((source) => source.permission === permission);
    if (!found) throw new Error(`No documentation source for permission ${permission}`);
    return found;
  }

  static isSchema(source: PermissionSource): source is SchemaSource {
    return 'file' in source;
  }
}
