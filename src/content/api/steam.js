import { bgRequest } from './request.js';
import { convertCurrency } from './fx.js';
import { getSettings } from '../settings.js';

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

const REVIEW_SCORE_RU = {
  'Overwhelmingly Positive': 'Крайне положительные',
  'Very Positive': 'Очень положительные',
  'Positive': 'Положительные',
  'Mostly Positive': 'В основном положительные',
  'Mixed': 'Смешанные',
  'Mostly Negative': 'В основном отрицательные',
  'Negative': 'Отрицательные',
  'Very Negative': 'Очень отрицательные',
  'Overwhelmingly Negative': 'Крайне отрицательные',
};

export async function resolveSteam(title) {
  const q = String(title || '').trim();
  if (!q) return null;

  const currentSettings = getSettings();
  const country = (currentSettings.steamCountry || 'KZ').toLowerCase();
  const targetCurrency = currentSettings.convertCurrency || 'RUB';

  try {
    const searchRes = await bgRequest({
      url: `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=${country}`,
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

    const reviewsInput = encodeURIComponent(JSON.stringify({ appid: appId, num_per_page: 0 }));
    const browseInput = encodeURIComponent(
      JSON.stringify({
        ids: [{ appid: appId }],
        context: { language: 'english', country_code: country.toUpperCase(), steam_realm: 1 },
        data_request: { include_platforms: true },
      })
    );

    // Fetch details, reviews, deck info, and player count in parallel
    const [detailsRes, reviewsRes, browseRes, playersRes] = await Promise.allSettled([
      bgRequest({
        url: `https://store.steampowered.com/api/appdetails?appids=${appId}&l=russian&cc=${country}`,
      }),
      bgRequest({
        url: `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${reviewsInput}`,
      }),
      bgRequest({
        url: `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${browseInput}`,
      }),
      bgRequest({
        url: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
      }),
    ]);

    const details = detailsRes.status === 'fulfilled' ? detailsRes.value?.[appId]?.data : null;
    const reviewData = reviewsRes.status === 'fulfilled' ? reviewsRes.value?.response?.query_summary : null;
    const browseItem = browseRes.status === 'fulfilled' ? browseRes.value?.response?.store_items?.[0] : null;
    const currentPlayers = playersRes.status === 'fulfilled' ? playersRes.value?.response?.player_count : null;

    // Price extraction
    const priceOverview = details?.price_overview || null;
    const isFree = details?.is_free || false;

    let priceFormatted = '';
    let discountPercent = 0;
    let convertedPrice = null; // { formatted: '~ 892 ₽', amount: 892, symbol: '₽' }

    if (isFree) {
      priceFormatted = 'Бесплатно';
    } else if (priceOverview) {
      priceFormatted = priceOverview.final_formatted || '';
      discountPercent = priceOverview.discount_percent || 0;
      const finalMajor = (priceOverview.final || 0) / 100;
      if (currentSettings.showPriceConvert !== false) {
        convertedPrice = await convertCurrency(finalMajor, priceOverview.currency, targetCurrency);
      }
    }

    // Reviews summary
    let reviewScoreDesc = '';
    let reviewPercent = null;
    let reviewCount = null;
    if (reviewData && reviewData.total_reviews > 0) {
      reviewCount = reviewData.total_reviews;
      reviewPercent = Math.round((reviewData.total_positive / reviewData.total_reviews) * 100);
      reviewScoreDesc = REVIEW_SCORE_RU[reviewData.review_score_desc] || reviewData.review_score_desc || '';
    } else if (details?.recommendations?.total) {
      reviewCount = details.recommendations.total;
    }

    // Genres & categories
    const genres = (details?.genres || []).map((g) => g.description);
    const categories = (details?.categories || []).map((c) => c.description);

    // Steam Deck compatibility
    let steamDeckStatus = null;
    const deckCat = Number(browseItem?.platforms?.steam_deck_compat_category);
    if (deckCat === 3) steamDeckStatus = 'Проверено';
    else if (deckCat === 2) steamDeckStatus = 'Можно играть';
    else if (deckCat === 1) steamDeckStatus = 'Не поддерживается';
    else if (categories.some((c) => /deck/i.test(c))) steamDeckStatus = 'Проверено';

    return {
      appId,
      name: details?.name || best.it.name,
      url: `https://store.steampowered.com/app/${appId}/`,
      headerImage: details?.header_image || best.it.tiny_image,
      priceFormatted,
      discountPercent,
      convertedPrice,
      approxRub: convertedPrice?.amount || null, // backwards compatibility
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

    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || !parsed.length) return null;

    let allTimePeak = 0;
    let peak24h = 0;
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;

    for (const item of parsed) {
      const ts = item[0];
      const count = item[1];
      if (count > allTimePeak) allTimePeak = count;
      if (ts >= oneDayAgo && count > peak24h) peak24h = count;
    }

    return {
      allTimePeak: allTimePeak || null,
      peak24h: peak24h || null,
    };
  } catch (err) {
    console.debug('[PANAX RU] SteamCharts error:', err);
    return null;
  }
}
