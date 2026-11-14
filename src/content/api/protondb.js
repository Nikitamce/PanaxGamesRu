import { bgRequest } from "./request.js";

export async function fetchProtonDb(appId) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const data = await bgRequest({
      url: `https://www.protondb.com/api/v1/reports/summaries/${id}.json`,
      allow404: true,
      headers: { Accept: "application/json" }
    });
    if (data && typeof data === "object") {
      const tier = typeof data.tier === "string" ? data.tier : null;
      if (tier) {
        return {
          tier,
          score: data.score != null ? Number(data.score) : null,
          total: data.total != null ? Number(data.total) : null,
          bestReportedTier: data.bestReportedTier || null,
          url: `https://www.protondb.com/app/${id}`
        };
      }
    }
  } catch (err) {
    console.debug("[PANAX RU] ProtonDB official API failed, trying mirror...", err);
  }
  try {
    const reports = await bgRequest({
      url: `https://protondb.max-p.me/games/${id}/reports/`,
      allow404: true,
      headers: { Accept: "application/json" }
    });
    if (Array.isArray(reports) && reports.length) {
      const tierWeights = { platinum: 5, gold: 4, silver: 3, bronze: 2, borked: 1 };
      const sample = reports.slice(0, 15);
      const counts = {};
      for (const rep of sample) {
        const r = (rep.rating || "").toLowerCase();
        if (tierWeights[r]) counts[r] = (counts[r] || 0) + 1;
      }
      let bestTier = "gold";
      let maxCount = 0;
      for (const [t, c] of Object.entries(counts)) {
        if (c > maxCount) {
          maxCount = c;
          bestTier = t;
        }
      }
      return {
        tier: bestTier,
        score: null,
        total: reports.length,
        bestReportedTier: bestTier,
        url: `https://www.protondb.com/app/${id}`
      };
    }
  } catch (err) {
    console.debug("[PANAX RU] ProtonDB mirror failed:", err);
  }
  return null;
}
