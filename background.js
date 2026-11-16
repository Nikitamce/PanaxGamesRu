/**
 * Background Service Worker for PANAX RU.
 * Handles cross-origin requests for game enrichments (OpenCritic, Steam, Metacritic, ProtonDB).
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;

  if (message.type === 'panax_xhr_blob') {
    const url = message.url;
    if (!url) {
      sendResponse({ success: false, error: 'No URL provided' });
      return false;
    }
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buf = await response.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        sendResponse({ success: true, contentType, b64: btoa(bin) });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error ? error.message : 'Network error' });
      });
    return true;
  }

  if (message.type !== 'panax_xhr') return false;

  const { details } = message;
  const { url, method = 'GET', headers = {}, data } = details || {};

  if (!url) {
    sendResponse({ success: false, error: 'No URL provided' });
    return false;
  }

  fetch(url, {
    method,
    headers,
    body: (method !== 'GET' && method !== 'HEAD') ? data : undefined,
  })
    .then(async (response) => {
      const text = await response.text();
      const responseHeaders = {};
      try {
        response.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });
      } catch (_) {}

      sendResponse({
        success: true,
        status: response.status,
        statusText: response.statusText,
        responseText: text,
        responseHeaders,
      });
    })
    .catch((error) => {
      sendResponse({
        success: false,
        error: error ? error.message : 'Network error',
      });
    });

  return true; // Keep channel open for async response
});

