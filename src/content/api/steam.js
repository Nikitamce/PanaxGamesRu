import { bgRequest } from './request.js';
import { convertToRub } from './fx.js';

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

export async function resolveSteam(title) {
  const q = String(title || '').trim();
  if (!q) return null;

  try {
    const searchRes = await bgRequest({
      url: `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=kz`,
    });

    const items = searchRes?.items || [];
    if (!items.length) return null;

    // Pick best matching app
    const scored = items
      .filter((it) => it.type === 'app' || !it.type)
      .map((it) => ({
        it,
        score: scoreTitleMatch(it.name, q),
      }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < 50) return null;

    const appId = Number(best.it.id);
    if (!appId) return null;

    // Fetch details & reviews in parallel
    const [detailsRes, reviewsRes, playersRes] = await Promise.allSettled([
      bgRequest({
        url: `https://store.steampowered.com/api/appdetails?appids=${appId}&l=russian&cc=kz`,
      }),
      bgRequest({
        url: `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all`,
      }),
      bgRequest({
        url: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
      }),
    ]);

    const details = detailsRes.status === 'fulfilled' ? detailsRes.value?.[appId]?.data : null;
    const reviews = reviewsRes.status === 'fulfilled' ? reviewsRes.value?.query_summary : null;
    const currentPlayers = playersRes.status === 'fulfilled' ? playersRes.value?.response?.player_count : null;

    // Price extraction
    const priceOverview = details?.price_overview || null;
    const isFree = details?.is_free || false;

    let priceFormatted = '';
    let discountPercent = 0;
    let approxRub = null;

    if (isFree) {
      priceFormatted = 'Бесплатно';
    } else if (priceOverview) {
      priceFormatted = priceOverview.final_formatted || '';
      discountPercent = priceOverview.discount_percent || 0;
      const finalMajor = (priceOverview.final || 0) / 100;
      approxRub = await convertToRub(finalMajor, priceOverview.currency);
    }

    // Reviews summary
    let reviewScoreDesc = '';
    let reviewPercent = null;
    let reviewCount = null;
    if (reviews && reviews.total_reviews > 0) {
      reviewCount = reviews.total_reviews;
      reviewPercent = Math.round((reviews.total_positive / reviews.total_reviews) * 100);
      reviewScoreDesc = reviews.review_score_desc || '';
    }

    // Genres & categories & tags
    const genres = (details?.genres || []).map((g) => g.description);
    const categories = (details?.categories || []).map((c) => c.description);

    // Steam Deck Verified: check categories or deck category
    // category 1 = Unsupported, 2 = Playable, 3 = Verified
    let steamDeckStatus = null;
    if (categories.some((c) => /deck/i.test(c))) {
      steamDeckStatus = 'Проверено';
    }

    return {
      appId,
      name: details?.name || best.it.name,
      url: `https://store.steampowered.com/app/${appId}/`,
      headerImage: details?.header_image || best.it.tiny_image,
      priceFormatted,
      discountPercent,
      approxRub,
      reviewPercent,
      reviewCount,
      reviewScoreDesc,
      genres,
      categories,
      steamDeckStatus,
      currentPlayers: Number.isFinite(currentPlayers) ? currentPlayers : null,
    };
  } catch (err) {
    console.debug('[PANAX RU] Steam resolve error:', err);
    return null;
  }
}

export async function fetchSteamCharts(appId) {
  const id = Number(appId);
  if (!id) return null;

  try {
    const raw = await bgRequest({
      url: `https://steamcharts.com/app/${id}/chart-data.json`,
      responseType: 'text',
    });

    let points = [];
    try {
      points = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {}

    if (!Array.isArray(points) || !points.length) return null;

    // Last 24 hours peak
    const now = Date.now();
    const dayAgo = now - 24 * 3600 * 1000;
    let peak24h = 0;
    let allTimePeak = 0;

    for (const [timestamp, count] of points) {
      if (count > allTimePeak) allTimePeak = count;
      if (timestamp >= dayAgo && count > peak24h) peak24h = count;
    }

    return {
      peak24h: peak24h > 0 ? peak24h : null,
      allTimePeak: allTimePeak > 0 ? allTimePeak : null,
    };
  } catch (_) {
    return null;
  }
}

