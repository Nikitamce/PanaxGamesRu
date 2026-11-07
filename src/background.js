/**
 * Background Service Worker for PANAX RU.
 * Handles cross-origin requests for game enrichments (OpenCritic, Steam, Metacritic, ProtonDB).
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'panax_xhr') return false;

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

