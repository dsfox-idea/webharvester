/**
 * Calls `owner[method](...args)` uniformly whether the API reports through a
 * callback, a promise, or both, and turns chrome.runtime.lastError into a
 * rejection. The method is invoked on its owner because ChromeSetting,
 * ContentSetting and StorageArea methods throw "Illegal invocation" when
 * detached.
 */
export function chromeCall(owner, method, ...args) {
  if (typeof owner?.[method] !== 'function') {
    return Promise.reject(new Error(`${method} is not a function on ${owner === undefined ? 'undefined' : 'the API object'}`));
  }
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
      returned = owner[method](...args, callback);
    } catch (error) {
      settle(error);
      return;
    }
    if (returned && typeof returned.then === 'function') {
      returned.then((value) => settle(null, value), (error) => settle(error));
    }
  });
}
