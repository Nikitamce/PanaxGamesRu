import { fetchOpenCritic } from '../api/opencritic.js';
import { fetchMetacritic } from '../api/metacritic.js';
import { fetchProtonDb } from '../api/protondb.js';
import { resolveSteam, fetchSteamCharts } from '../api/steam.js';

let activeGameTitle = '';
let activeSteamData = null;
let activeSteamCharts = null;
let activeOcData = null;
let activeMcData = null;
let activeProtonData = null;
let isFetching = false;

function getGameTitleFromDom() {
  const titleTag = document.title || '';
  const fromTitle = titleTag.replace(/\s*\|\s*PANAX.*$/i, '').trim();
  if (fromTitle && fromTitle !== 'PANAX') return fromTitle;

  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent?.trim()) return h1.textContent.trim();

  // Try meta tags
  const metaOg = document.querySelector('meta[property="og:title"]');
  if (metaOg?.content) {
    return metaOg.content.replace(/\s*\|\s*PANAX.*$/i, '').trim();
  }

  return '';
}

function getGameYearFromDom() {
  const text = document.body?.textContent || '';
  const m = text.match(/\b(19\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : null;
}

/**
 * Identify active tab: 'about' | 'players' | 'community'
 */
function getActiveTab() {
  // Find tab buttons
  const buttons = document.querySelectorAll('button, [role="tab"], a');
  for (const btn of buttons) {
    const text = (btn.textContent || '').trim().toLowerCase();
    const isActive =
      btn.getAttribute('aria-selected') === 'true' ||
      btn.className?.includes('active') ||
      btn.querySelector('div[class*="underline"], span[class*="border"], hr');

    if (text.includes('о игре') || text.includes('about')) {
      if (btn.classList.contains('border-b') || btn.querySelector('[class*="border"]') || btn.getAttribute('data-state') === 'active') {
        return 'about';
      }
    }
  }

  // Fallback: check content visible on page
  const pageText = document.body?.textContent || '';
  if (pageText.includes('How Long To Beat') || pageText.includes('Платформы') || pageText.includes('Platforms')) {
    return 'about';
  }
  if (pageText.includes('Игроки с этой игрой') || pageText.includes('Players with this game') || pageText.includes('Как вам?')) {
    return 'players';
  }

  return 'players';
}

function renderRatingsCard(oc, mc, steam, proton) {
  let badgesHtml = '';

  // OpenCritic
  if (oc?.tier) {
    const tierClass = (oc.tier || '').toLowerCase();
    const scoreText = oc.score ? ` · ${oc.score}` : '';
    const recText = oc.percentRecommended ? ` (${oc.percentRecommended}% реком.)` : '';
    badgesHtml += `
      <a class="panax-badge panax-badge-oc ${tierClass}" href="${oc.url}" target="_blank" rel="noopener noreferrer" title="OpenCritic Score">
        <span>OpenCritic: <strong>${oc.tier}${scoreText}</strong>${recText}</span>
      </a>
    `;
  }

  // Metacritic
  if (mc?.score != null) {
    const s = mc.score;
    const tier = s >= 75 ? 'high' : s >= 50 ? 'mid' : 'low';
    badgesHtml += `
      <a class="panax-badge panax-badge-mc" href="${mc.url}" target="_blank" rel="noopener noreferrer" title="Metascore">
        <span class="mc-val ${tier}">${s}</span>
        <span>Metacritic</span>
      </a>
    `;
  }

  // Steam Deck
  if (steam?.steamDeckStatus) {
    badgesHtml += `
      <span class="panax-badge panax-badge-deck" title="Совместимость со Steam Deck">
        <span>🎮 Steam Deck: ${steam.steamDeckStatus}</span>
      </span>
    `;
  }

  // ProtonDB
  if (proton?.tier) {
    badgesHtml += `
      <a class="panax-badge panax-badge-proton" href="${proton.url}" target="_blank" rel="noopener noreferrer" title="ProtonDB Tier">
        <span>🐧 ProtonDB ${proton.tier.toUpperCase()}</span>
      </a>
    `;
  }

  if (!badgesHtml) return '';

  return `
    <div class="panax-plus-card" id="panax-ratings-card">
      <div class="panax-plus-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <span>Оценки критиков и совместимость</span>
      </div>
      <div class="panax-badges-row">
        ${badgesHtml}
      </div>
    </div>
  `;
}

function renderSteamStoreCard(steam) {
  if (!steam) return '';

  let priceHtml = '';
  if (steam.priceFormatted) {
    priceHtml = `
      <div class="panax-price-row">
        ${steam.discountPercent > 0 ? `<span class="panax-discount-pill">-${steam.discountPercent}%</span>` : ''}
        <span class="panax-price-val">${steam.priceFormatted}</span>
        ${steam.approxRub ? `<span class="panax-approx-rub">~ ${steam.approxRub.toLocaleString('ru-RU')} ₽</span>` : ''}
      </div>
    `;
  }

  let reviewHtml = '';
  if (steam.reviewPercent != null) {
    reviewHtml = `
      <div class="panax-review-badge">
        <span>👍 ${steam.reviewPercent}% рекомендуют (${steam.reviewCount?.toLocaleString('ru-RU')} отзывов)</span>
      </div>
    `;
  }

  let tagsHtml = '';
  const tags = [...(steam.genres || []), ...(steam.categories || [])].slice(0, 8);
  if (tags.length) {
    tagsHtml = `
      <div class="panax-tags-row">
        ${tags.map((t) => `<span class="panax-tag">${t}</span>`).join('')}
      </div>
    `;
  }

  return `
    <div class="panax-plus-card" id="panax-steam-card">
      <div class="panax-plus-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        <span>Магазин Steam</span>
      </div>
      <div class="panax-steam-box">
        ${priceHtml}
        ${reviewHtml}
        ${tagsHtml}
      </div>
    </div>
  `;
}

function renderQuickLinks(title, steam, oc, mc) {
  const encTitle = encodeURIComponent(title);
  const links = [];

  if (steam?.url) {
    links.push(`<a class="panax-quick-btn" href="${steam.url}" target="_blank" rel="noopener noreferrer">Steam</a>`);
    links.push(`<a class="panax-quick-btn" href="https://steamdb.info/app/${steam.appId}/" target="_blank" rel="noopener noreferrer">SteamDB</a>`);
  }
  links.push(`<a class="panax-quick-btn" href="https://www.pcgamingwiki.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}" target="_blank" rel="noopener noreferrer">PCGamingWiki</a>`);

  if (oc?.url) {
    links.push(`<a class="panax-quick-btn" href="${oc.url}" target="_blank" rel="noopener noreferrer">OpenCritic</a>`);
  }
  if (mc?.url) {
    links.push(`<a class="panax-quick-btn" href="${mc.url}" target="_blank" rel="noopener noreferrer">Metacritic</a>`);
  }
  links.push(`<a class="panax-quick-btn" href="https://www.igdb.com/search?q=${encTitle}" target="_blank" rel="noopener noreferrer">IGDB</a>`);

  return `
    <div class="panax-plus-card" id="panax-quick-links-card">
      <div class="panax-plus-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>Быстрые ссылки</span>
      </div>
      <div class="panax-quick-links">
        ${links.join('')}
      </div>
    </div>
  `;
}

function renderPlayerStatsCard(steam, charts) {
  let onlineBadge = '';
  if (steam?.currentPlayers != null) {
    onlineBadge = `
      <div class="panax-online-badge">
        <span class="panax-online-dot"></span>
        <span>${steam.currentPlayers.toLocaleString('ru-RU')} игроков онлайн (Steam)</span>
      </div>
    `;
  }

  let statsGrid = '';
  if (charts?.peak24h || charts?.allTimePeak) {
    statsGrid = `
      <div class="panax-steam-stats-grid">
        ${charts.peak24h ? `
          <div class="panax-stat-box">
            <span class="label">Пик за 24 часа</span>
            <span class="val">${charts.peak24h.toLocaleString('ru-RU')}</span>
          </div>
        ` : ''}
        ${charts.allTimePeak ? `
          <div class="panax-stat-box">
            <span class="label">Рекорд онлайна</span>
            <span class="val">${charts.allTimePeak.toLocaleString('ru-RU')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Parse Panax community counters from page
  const breakdown = parsePanaxCommunityNumbers();
  let progressHtml = '';
  if (breakdown && breakdown.totalActive > 0) {
    const beatenPct = Math.round((breakdown.beaten / breakdown.totalActive) * 100);
    const playingPct = Math.round((breakdown.playing / breakdown.totalActive) * 100);
    const backlogPct = Math.round((breakdown.backlog / breakdown.totalActive) * 100);
    const pausedPct = Math.round((breakdown.paused / breakdown.totalActive) * 100);
    const droppedPct = Math.round((breakdown.dropped / breakdown.totalActive) * 100);

    progressHtml = `
      <div class="panax-progress-bar-container">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600;">
          <span>Прогресс игроков Panax:</span>
          <span style="color:#10b981;">${beatenPct}% завершили</span>
        </div>
        <div class="panax-progress-bar">
          <div class="panax-progress-seg beaten" style="width: ${beatenPct}%" title="Пройдено: ${breakdown.beaten} (${beatenPct}%)"></div>
          <div class="panax-progress-seg playing" style="width: ${playingPct}%" title="Играют: ${breakdown.playing} (${playingPct}%)"></div>
          <div class="panax-progress-seg backlog" style="width: ${backlogPct}%" title="В планах: ${breakdown.backlog} (${backlogPct}%)"></div>
          <div class="panax-progress-seg paused" style="width: ${pausedPct}%" title="Пауза: ${breakdown.paused} (${pausedPct}%)"></div>
          <div class="panax-progress-seg dropped" style="width: ${droppedPct}%" title="Брошено: ${breakdown.dropped} (${droppedPct}%)"></div>
        </div>
        <div class="panax-progress-legend">
          <span class="panax-legend-item"><span class="panax-legend-dot" style="background:#10b981;"></span>Пройдено (${breakdown.beaten})</span>
          <span class="panax-legend-item"><span class="panax-legend-dot" style="background:#3b82f6;"></span>Играют (${breakdown.playing})</span>
          <span class="panax-legend-item"><span class="panax-legend-dot" style="background:#8b5cf6;"></span>В планах (${breakdown.backlog})</span>
          <span class="panax-legend-item"><span class="panax-legend-dot" style="background:#f59e0b;"></span>Пауза (${breakdown.paused})</span>
          <span class="panax-legend-item"><span class="panax-legend-dot" style="background:#ef4444;"></span>Брошено (${breakdown.dropped})</span>
        </div>
      </div>
    `;
  }

  if (!onlineBadge && !statsGrid && !progressHtml) return '';

  return `
    <div class="panax-plus-card" id="panax-players-card">
      <div class="panax-plus-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Активность сообщества и игроков</span>
      </div>
      ${onlineBadge}
      ${statsGrid}
      ${progressHtml}
    </div>
  `;
}

function parsePanaxCommunityNumbers() {
  const text = document.body?.textContent || '';
  // Try to find numbers above or below status labels
  // Labels: Играю, Пройдено, Желаемое, В планах, Пауза, Брошено
  const parseNum = (label) => {
    const rx = new RegExp(`(\\d+)\\s*\\n?\\s*${label}|${label}\\s*\\n?\\s*(\\d+)`, 'i');
    const m = text.match(rx);
    if (!m) return 0;
    return Number(m[1] || m[2] || 0);
  };

  const beaten = parseNum('Пройдено') || parseNum('Beaten');
  const playing = parseNum('Играю') || parseNum('Playing');
  const backlog = parseNum('В планах') || parseNum('Backlog');
  const paused = parseNum('Пауза') || parseNum('Paused');
  const dropped = parseNum('Брошено') || parseNum('Quit');

  const totalActive = beaten + playing + backlog + paused + dropped;
  return { beaten, playing, backlog, paused, dropped, totalActive };
}

async function loadGameData(title) {
  if (isFetching || !title) return;
  isFetching = true;

  try {
    const [steam, oc, mc] = await Promise.all([
      resolveSteam(title),
      fetchOpenCritic(title),
      fetchMetacritic(title),
    ]);

    activeSteamData = steam;
    activeOcData = oc;
    activeMcData = mc;

    if (steam?.appId) {
      const [proton, charts] = await Promise.all([
        fetchProtonDb(steam.appId),
        fetchSteamCharts(steam.appId),
      ]);
      activeProtonData = proton;
      activeSteamCharts = charts;
    }
  } catch (err) {
    console.error('[PANAX RU] Error fetching enrichments:', err);
  } finally {
    isFetching = false;
  }
}

function findMountTarget(tab) {
  // Look for main content container
  const main = document.querySelector('main');
  if (!main) return null;

  if (tab === 'about') {
    // Mount below How Long To Beat or Platforms section
    const hltb = [...main.querySelectorAll('*')].find((el) =>
      el.textContent?.includes('How Long To Beat') && el.children.length > 0
    );
    if (hltb) {
      // Find suitable card container
      const card = hltb.closest('div[class*="rounded"], section, div');
      if (card && card.parentElement) {
        return { parent: card.parentElement, before: card.nextSibling };
      }
    }
  }

  if (tab === 'players') {
    // Mount below "Игроки с этой игрой" or ratings grid
    const playersBlock = [...main.querySelectorAll('*')].find((el) =>
      (el.textContent?.includes('Игроки с этой игрой') || el.textContent?.includes('Players with this game')) &&
      el.children.length > 0
    );
    if (playersBlock) {
      const card = playersBlock.closest('div[class*="rounded"], section, div');
      if (card && card.parentElement) {
        return { parent: card.parentElement, before: card.nextSibling };
      }
    }
  }

  // Fallback: bottom of main
  return { parent: main, before: null };
}

function injectUi() {
  const currentTitle = getGameTitleFromDom();
  if (!currentTitle) return;

  const tab = getActiveTab();

  if (tab === 'about') {
    // Remove player stats card if present
    document.getElementById('panax-players-card')?.remove();

    if (!document.getElementById('panax-ratings-card') && (activeOcData || activeMcData || activeSteamData || activeProtonData)) {
      const target = findMountTarget('about');
      if (target?.parent) {
        const container = document.createElement('div');
        container.id = 'panax-about-enrichment';
        container.innerHTML = `
          ${renderRatingsCard(activeOcData, activeMcData, activeSteamData, activeProtonData)}
          ${renderSteamStoreCard(activeSteamData)}
          ${renderQuickLinks(currentTitle, activeSteamData, activeOcData, activeMcData)}
        `;
        target.parent.insertBefore(container, target.before);
      }
    }
  } else if (tab === 'players') {
    // Remove about cards if present
    document.getElementById('panax-about-enrichment')?.remove();

    if (!document.getElementById('panax-players-card')) {
      const target = findMountTarget('players');
      if (target?.parent) {
        const container = document.createElement('div');
        container.id = 'panax-players-card-container';
        container.innerHTML = renderPlayerStatsCard(activeSteamData, activeSteamCharts);
        target.parent.insertBefore(container, target.before);
      }
    }
  }
}

export function startEnrichment() {
  if (!location.pathname.includes('/game-detail/')) return;

  const title = getGameTitleFromDom();
  if (title && title !== activeGameTitle) {
    activeGameTitle = title;
    activeSteamData = null;
    activeSteamCharts = null;
    activeOcData = null;
    activeMcData = null;
    activeProtonData = null;

    loadGameData(title).then(() => {
      injectUi();
    });
  } else {
    injectUi();
  }

  // Re-check on URL/tab changes
  const observer = new MutationObserver(() => {
    if (!location.pathname.includes('/game-detail/')) return;
    const newTitle = getGameTitleFromDom();
    if (newTitle && newTitle !== activeGameTitle) {
      activeGameTitle = newTitle;
      loadGameData(newTitle).then(() => injectUi());
    } else {
      injectUi();
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
}

