import { bgRequest } from './request.js';

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchMetacritic(title) {
  const slug = slugify(title);
  if (!slug) return null;

  const url = `https://www.metacritic.com/game/${slug}/`;
  try {
    const html = await bgRequest({
      url,
      responseType: 'text',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (typeof html !== 'string') return null;

    const metascoreMatch =
      html.match(/c-siteReviewScore[^\>]*\><span>(\d+)/i) ||
      html.match(/"metascore":\s*(\d+)/i) ||
      html.match(/class="[^"]*c-productScoreInfo_scoreNumber[^"]*"[^>]*>(\d+)/i);

    const userScoreMatch =
      html.match(/c-siteReviewScore_user[^\>]*\><span>([\d.]+)/i) ||
      html.match(/"userScore":\s*"([\d.]+)"/i);

    const metascore = metascoreMatch ? Number(metascoreMatch[1]) : null;
    const userScore = userScoreMatch ? parseFloat(userScoreMatch[1]) : null;

    if (!metascore && !userScore) return null;

    return {
      score: metascore,
      userScore: Number.isFinite(userScore) ? userScore : null,
      url,
    };
  } catch (err) {
    console.debug('[PANAX RU] Metacritic fetch error:', err);
    return null;
  }
}

