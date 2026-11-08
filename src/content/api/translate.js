import { bgRequest } from './request.js';

const cache = new Map();

function hashText(s) {
  let h = 5381;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * Translates text into target language using Google Translate Chrome Extension endpoint
 * with fallback to MyMemory.
 * @param {string} text
 * @param {string} targetLang ('ru', 'en', etc.)
 * @returns {Promise<{ text: string, detectedSourceLang: string } | null>}
 */
export async function translateText(text, targetLang = 'ru') {
  const plain = String(text || '').trim();
  const tl = String(targetLang || 'ru').trim().toLowerCase().slice(0, 2);
  if (!plain) return null;

  const key = `${tl}:${hashText(plain)}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  // 1. Google Translate (dict-chrome-ex) - fast and unblocked
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(plain)}`;
    const data = await bgRequest({
      url,
      responseType: 'json',
      headers: { Accept: 'application/json' },
    });

    if (Array.isArray(data) && data[0]) {
      const segs = Array.isArray(data[0]) ? data.map((item) => (Array.isArray(item) ? item[0] : item)).join(' ') : String(data[0]);
      const detected = Array.isArray(data[0]) && data[0][1] ? String(data[0][1]).toLowerCase().slice(0, 2) : '';
      if (segs) {
        const result = { text: segs.trim(), detectedSourceLang: detected };
        cache.set(key, result);
        return result;
      }
    }
  } catch (err) {
    console.debug('[PANAX RU] Google translate failed, trying MyMemory fallback...', err);
  }

  // 2. Fallback: MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(plain.slice(0, 500))}&langpair=auto|${encodeURIComponent(tl)}`;
    const data = await bgRequest({
      url,
      responseType: 'json',
      headers: { Accept: 'application/json' },
    });

    const translated = data?.responseData?.translatedText;
    if (translated && !translated.startsWith('MYMEMORY WARNING:')) {
      const result = {
        text: translated.trim(),
        detectedSourceLang: '',
      };
      cache.set(key, result);
      return result;
    }
  } catch (err) {
    console.debug('[PANAX RU] MyMemory translation failed:', err);
  }

  return null;
}

