import { bgRequest } from './request.js';

const cache = new Map();

function titleToSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetch game rating from Backloggd
 * @param {string} title
 * @returns {Promise<{ rating: string, url: string } | null>}
 */
export async function fetchBackloggdRating(title) {
  const q = String(title || '').trim();
  if (!q) return null;

  const slug = titleToSlug(q);
  if (cache.has(slug)) {
    return cache.get(slug);
  }

  const url = `https://www.backloggd.com/games/${slug}/`;

  try {
    const html = await bgRequest({
      url,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!html || typeof html !== 'string') return null;

    // 1. JSON-LD ratingValue
    // 2. <h1>3.9</h1> in rating header
    const match =
      html.match(/"ratingValue":\s*"?([0-5](?:\.\d+)?)"?/i) ||
      html.match(/<h1[^>]*>\s*([0-5]\.\d+)\s*<\/h1>/i);

    if (match) {
      const score = Number(match[1]);
      if (Number.isFinite(score) && score > 0 && score <= 5) {
        const result = {
          rating: score.toFixed(1),
          url,
        };
        cache.set(slug, result);
        return result;
      }
    }
  } catch (err) {
    console.debug('[PANAX RU] Backloggd fetch error:', err);
  }

  return null;
}

