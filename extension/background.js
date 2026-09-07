// Service worker. Kept minimal: the permission probes run in probe.html, an
// extension page, because a few APIs are unavailable to service workers
// (e.g. tabCapture.capture) while every API is available to extension pages.

const log = (...args) => console.log('[webharvester]', ...args);

chrome.runtime.onInstalled.addListener((details) => {
  log('installed', details.reason, 'id', chrome.runtime.id);
});

chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('probe.html');
  log('opening', url);
  await chrome.tabs.create({ url });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'content-script-ready') {
    log('content script in', sender.frameId === 0 ? 'top frame' : `frame ${sender.frameId}`, sender.url);
    sendResponse({ ok: true });
  }
  return false;
});

log('service worker started');
