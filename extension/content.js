// Runs at document_start in every frame of every URL (see manifest
// content_scripts). Marks the frame so tests can prove the injection happened,
// and tells the service worker.
(() => {
  const info = {
    url: location.href,
    top: window === window.top,
    readyState: document.readyState,
    injectedAt: Date.now(),
  };
  const mark = () => {
    if (document.documentElement) document.documentElement.setAttribute('data-webharvester', JSON.stringify(info));
  };
  mark();
  if (!document.documentElement) document.addEventListener('DOMContentLoaded', mark, { once: true });
  try {
    chrome.runtime.sendMessage({ type: 'content-script-ready', info }).catch(() => {});
  } catch {
    // Extension context can be gone after a reload; the DOM mark still stands.
  }
})();
