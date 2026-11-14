import { bgRequest } from "./request.js";
import { convertCurrency } from "./fx.js";
import { getSettings } from "../settings.js";

function cleanTitle2(s) {
  return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function scoreTitleMatch2(a, b) {
  const normA = cleanTitle2(a);
  const normB = cleanTitle2(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 100;
  if (normA.startsWith(normB) || normB.startsWith(normA)) return 85;
  if (normA.includes(normB) || normB.includes(normA)) return 75;
  return 0;
}
var REVIEW_SCORE_RU = {
  "Overwhelmingly Positive": "\u041A\u0440\u0430\u0439\u043D\u0435 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Very Positive": "\u041E\u0447\u0435\u043D\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Positive": "\u041F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Mostly Positive": "\u0412 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Mixed": "\u0421\u043C\u0435\u0448\u0430\u043D\u043D\u044B\u0435",
  "Mostly Negative": "\u0412 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Negative": "\u041E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Very Negative": "\u041E\u0447\u0435\u043D\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435",
  "Overwhelmingly Negative": "\u041A\u0440\u0430\u0439\u043D\u0435 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435"
};
export async function resolveSteam(title) {
  const q = String(title || "").trim();
  if (!q) return null;
  const currentSettings2 = getSettings();
  const country = (currentSettings2.steamCountry || "KZ").toLowerCase();
  const targetCurrency = currentSettings2.convertCurrency || "RUB";
  try {
    const searchRes = await bgRequest({
      url: `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=${country}`
    });
    const items = searchRes?.items || [];
    if (!items.length) return null;
    const scored = items.filter((it) => it.type === "app" || !it.type).map((it) => ({
      it,
      score: scoreTitleMatch2(it.name, q)
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
        context: { language: "english", country_code: country.toUpperCase(), steam_realm: 1 },
        data_request: { include_platforms: true }
      })
    );
    const [detailsRes, reviewsRes, browseRes, playersRes] = await Promise.allSettled([
      bgRequest({
        url: `https://store.steampowered.com/api/appdetails?appids=${appId}&l=russian&cc=${country}`
      }),
      bgRequest({
        url: `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${reviewsInput}`
      }),
      bgRequest({
        url: `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${browseInput}`
      }),
      bgRequest({
        url: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`
      })
    ]);
    const details = detailsRes.status === "fulfilled" ? detailsRes.value?.[appId]?.data : null;
    const reviewData = reviewsRes.status === "fulfilled" ? reviewsRes.value?.response?.query_summary : null;
    const browseItem = browseRes.status === "fulfilled" ? browseRes.value?.response?.store_items?.[0] : null;
    const currentPlayers = playersRes.status === "fulfilled" ? playersRes.value?.response?.player_count : null;
    const priceOverview = details?.price_overview || null;
    const isFree = details?.is_free || false;
    let priceFormatted = "";
    let discountPercent = 0;
    let convertedPrice = null;
    if (isFree) {
      priceFormatted = "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E";
    } else if (priceOverview) {
      priceFormatted = priceOverview.final_formatted || "";
      discountPercent = priceOverview.discount_percent || 0;
      const finalMajor = (priceOverview.final || 0) / 100;
      if (currentSettings2.showPriceConvert !== false) {
        convertedPrice = await convertCurrency(finalMajor, priceOverview.currency, targetCurrency);
      }
    }
    let reviewScoreDesc = "";
    let reviewPercent = null;
    let reviewCount = null;
    if (reviewData && reviewData.total_reviews > 0) {
      reviewCount = reviewData.total_reviews;
      reviewPercent = Math.round(reviewData.total_positive / reviewData.total_reviews * 100);
      reviewScoreDesc = REVIEW_SCORE_RU[reviewData.review_score_desc] || reviewData.review_score_desc || "";
    } else if (details?.recommendations?.total) {
      reviewCount = details.recommendations.total;
    }
    const genres = (details?.genres || []).map((g) => g.description);
    const categories = (details?.categories || []).map((c) => c.description);
    let steamDeckStatus = null;
    const deckCat = Number(browseItem?.platforms?.steam_deck_compat_category);
    if (deckCat === 3) steamDeckStatus = "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E";
    else if (deckCat === 2) steamDeckStatus = "\u041C\u043E\u0436\u043D\u043E \u0438\u0433\u0440\u0430\u0442\u044C";
    else if (deckCat === 1) steamDeckStatus = "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F";
    else if (categories.some((c) => /deck/i.test(c))) steamDeckStatus = "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E";
    return {
      appId,
      name: details?.name || best.it.name,
      url: `https://store.steampowered.com/app/${appId}/`,
      headerImage: details?.header_image || best.it.tiny_image,
      priceFormatted,
      discountPercent,
      convertedPrice,
      approxRub: convertedPrice?.amount || null,
      // backwards compatibility
      reviewPercent,
      reviewCount,
      reviewScoreDesc,
      genres,
      categories,
      steamDeckStatus,
      currentPlayers: Number.isFinite(currentPlayers) ? currentPlayers : null
    };
  } catch (err) {
    console.debug("[PANAX RU] Steam resolve error:", err);
    return null;
  }
}
export async function fetchSteamCharts(appId) {
  const id = Number(appId);
  if (!id) return null;
  try {
    const raw = await bgRequest({
      url: `https://steamcharts.com/app/${id}/chart-data.json`,
      responseType: "text"
    });
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    let allTimePeak = 0;
    let peak24h = 0;
    const oneDayAgo = Date.now() - 24 * 3600 * 1e3;
    for (const item of parsed) {
      const ts = item[0];
      const count = item[1];
      if (count > allTimePeak) allTimePeak = count;
      if (ts >= oneDayAgo && count > peak24h) peak24h = count;
    }
    return {
      allTimePeak: allTimePeak || null,
      peak24h: peak24h || null
    };
  } catch (err) {
    console.debug("[PANAX RU] SteamCharts error:", err);
    return null;
  }
}
