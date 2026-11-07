/**
 * Cross-origin request utility using the extension's background service worker.
 */

export function bgRequest(details) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: 'panax_xhr', details }, (res) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!res) {
            return reject(new Error('No response from background worker'));
          }
          if (!res.success) {
            return reject(new Error(res.error || `HTTP ${res.status}`));
          }
          let parsed = res.responseText;
          if (details.responseType !== 'text') {
            try {
              parsed = JSON.parse(res.responseText);
            } catch (_) {}
          }
          resolve(parsed);
        });
        return;
      } catch (err) {
        // Fall back to direct fetch if sendMessage fails
      }
    }

    // Direct fetch fallback
    fetch(details.url, {
      method: details.method || 'GET',
      headers: details.headers || {},
      body: details.data,
    })
      .then(async (res) => {
        if (!res.ok && !details.allow404) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (details.responseType === 'text') {
          return res.text();
        }
        return res.json().catch(() => res.text());
      })
      .then(resolve)
      .catch(reject);
  });
}
