import { bgRequest } from './request.js';

function cleanTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function scoreTitleMatch(a, b) {
  const normA = cleanTitle(a);
  const normB = cleanTitle(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 100;
  if (normA.startsWith(normB) || normB.startsWith(normA)) return 85;
  if (normA.includes(normB) || normB.includes(normA)) return 75;
  return 0;
}

export async function fetchOpenCritic(title) {
  const q = String(title || '').trim();
  if (!q) return null;

  // Try fetching OpenCritic via bgRequest
  try {
    const list = await bgRequest({
      url: `https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(q)}`,
      headers: {
        Accept: 'application/json',
        Referer: 'https://opencritic.com/',
      },
    });

    if (!Array.isArray(list) || !list.length) return null;

    const scored = list.map((item) => ({
      item,
      score: scoreTitleMatch(item.name, q),
      dist: Number(item.dist) || 99,
    }));

    scored.sort((a, b) => b.score - a.score || a.dist - b.dist);
    const best = scored[0];
    if (!best || (best.score < 60 && best.dist > 0.2)) return null;

    const hit = best.item;
    let detail = null;
    try {
      detail = await bgRequest({
        url: `https://api.opencritic.com/api/game/${hit.id}`,
        headers: {
          Accept: 'application/json',
          Referer: 'https://opencritic.com/',
        },
      });
    } catch (_) {}

    const data = detail || hit;
    const tier = data.tier || hit.tier;
    const score = Math.round(Number(data.topCriticScore || hit.topCriticScore || data.medianScore || 0));
    const percentRecommended = Math.round(Number(data.percentRecommended || 0));
    const slug = data.slug || hit.slug;
    const url = slug
      ? `https://opencritic.com/game/${data.id}/${slug}`
      : `https://opencritic.com/game/${data.id}`;

    return {
      id: data.id,
      name: data.name || hit.name,
      tier: tier || null,
      score: score > 0 ? score : null,
      percentRecommended: percentRecommended > 0 ? percentRecommended : null,
      url,
    };
  } catch (err) {
    console.debug('[PANAX RU] OpenCritic fetch error:', err);
    return null;
  }
}
