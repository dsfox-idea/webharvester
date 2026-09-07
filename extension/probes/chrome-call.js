/**
 * Calls a chrome.* API method uniformly whether it reports through a callback,
 * a promise, or both, and turns chrome.runtime.lastError into a rejection.
 */
export function chromeCall(fn, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      error ? reject(error) : resolve(value);
    };
    const callback = (value) => {
      const lastError = chrome.runtime.lastError;
      settle(lastError ? new Error(lastError.message) : null, value);
    };
    let returned;
    try {
      returned = fn(...args, callback);
    } catch (error) {
      settle(error);
      return;
    }
    if (returned && typeof returned.then === 'function') {
      returned.then((value) => settle(null, value), (error) => settle(error));
    }
  });
}
