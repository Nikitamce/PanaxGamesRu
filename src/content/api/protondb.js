import { bgRequest } from './request.js';

export async function fetchProtonDb(appId) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return null;

  try {
    const data = await bgRequest({
      url: `https://www.protondb.com/api/v1/reports/summaries/${id}.json`,
      allow404: true,
      headers: { Accept: 'application/json' },
    });

    if (!data || typeof data !== 'object') return null;
    const tier = typeof data.tier === 'string' ? data.tier : null;
    if (!tier) return null;

    return {
      tier,
      score: data.score != null ? Number(data.score) : null,
      total: data.total != null ? Number(data.total) : null,
      bestReportedTier: data.bestReportedTier || null,
      url: `https://www.protondb.com/app/${id}`,
    };
  } catch (err) {
    console.debug('[PANAX RU] ProtonDB fetch error:', err);
    return null;
  }
}
