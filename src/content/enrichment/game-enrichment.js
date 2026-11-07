import { fetchOpenCritic } from '../api/opencritic.js';
import { fetchMetacritic } from '../api/metacritic.js';
import { fetchProtonDb } from '../api/protondb.js';
import { resolveSteam, fetchSteamCharts } from '../api/steam.js';
import { getSettings, loadSettings } from '../settings.js';

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

  const metaOg = document.querySelector('meta[property="og:title"]');
  if (metaOg?.content) {
    const t = metaOg.content.replace(/\s*\|\s*PANAX.*$/i, '').trim();
    if (t && t !== 'PANAX') return t;
  }

  const header = document.querySelector('div[class*="text-2xl"], div[class*="text-xl"], h2');
  if (header && header.textContent?.trim()) {
    const text = header.textContent.trim();
    if (text.length < 80 && !text.includes('\n')) return text;
  }

  return '';
}

function findSectionCard(keywords) {
  const normKeywords = keywords.map((k) => k.toLowerCase());
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p');

  for (const el of elements) {
    if (el.children.length > 3) continue;
    const text = (el.textContent || '').trim().toLowerCase();
    if (!text) continue;

    for (const kw of normKeywords) {
      if (text === kw || text.startsWith(kw)) {
        let cur = el;
        let bestCard = el.parentElement;
        while (cur && cur.parentElement && cur.parentElement !== document.body) {
          const p = cur.parentElement;
          if (p === document.body) break;
          const cls = cur.className || '';
          if (cur.tagName === 'SECTION' || /rounded|bg-|space-y|border|card/i.test(cls)) {
            const h = cur.offsetHeight || cur.getBoundingClientRect().height;
            if (h > 40 && h < 1400) {
              bestCard = cur;
              break;
            }
          }
          cur = p;
        }
        return bestCard;
      }
    }
  }
  return null;
}

/**
 * Identify active tab: 'about' | 'players' | 'community'
 */
function getActiveTab() {
  // Find tab container row (usually 3 tabs: Player data, Community, About)
  const bars = document.querySelectorAll('div, nav');
  for (const bar of bars) {
    if (bar.children.length >= 2 && bar.children.length <= 6) {
      const t = (bar.textContent || '').toLowerCase();
      const hasPlayersTab = t.includes('данные игроков') || t.includes('player data');
      const hasAboutTab = t.includes('о игре') || t.includes('about');

      if (hasPlayersTab && hasAboutTab) {
        for (const tabEl of bar.children) {
          const tabText = (tabEl.textContent || '').toLowerCase();
          const isActive =
            tabEl.getAttribute('aria-selected') === 'true' ||
            tabEl.getAttribute('data-state') === 'active' ||
            tabEl.className?.includes('border-b') ||
            tabEl.className?.includes('border-white') ||
            tabEl.className?.includes('text-white') ||
            tabEl.querySelector('div[class*="border"], div[class*="bg-white"], span[class*="border"], hr');

          if (isActive) {
            if (tabText.includes('данные игроков') || tabText.includes('player data')) {
              return 'players';
            }
            if (tabText.includes('о игре') || tabText.includes('about')) {
              return 'about';
            }
            if (tabText.includes('сообщество') || tabText.includes('community')) {
              return 'community';
            }
          }
        }
      }
    }
  }

  // Fallback: check visible headings in the viewport
  const candidates = document.querySelectorAll('h1, h2, h3, h4, div, span, p');
  for (const h of candidates) {
    if (h.children.length > 2) continue;
    const txt = (h.textContent || '').trim().toLowerCase();
    if (
      txt.startsWith('как вам?') ||
      txt.startsWith('how was it?') ||
      txt.startsWith('игроки с этой игрой') ||
      txt.startsWith('players with this game')
    ) {
      if (h.offsetParent !== null) return 'players';
    }
  }

  for (const h of candidates) {
    if (h.children.length > 2) continue;
    const txt = (h.textContent || '').trim().toLowerCase();
    if (txt.includes('how long to beat') || txt.startsWith('платформы') || txt.startsWith('platforms')) {
      if (h.offsetParent !== null) return 'about';
    }
  }

  return 'about';
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
    const tierLower = proton.tier.toLowerCase();
    const tierUpper = proton.tier.toUpperCase();
    badgesHtml += `
      <a class="panax-badge panax-badge-proton ${tierLower}" href="${proton.url}" target="_blank" rel="noopener noreferrer" title="ProtonDB Tier">
        <span>🐧 ProtonDB: ${tierUpper}</span>
      </a>
    `;
  }

  if (!badgesHtml) {
    badgesHtml = `
      <span style="font-size: 0.85rem; color: #9ca3af; margin-right: 0.5rem;">Оценки критиков:</span>
      <a class="panax-badge panax-badge-oc" href="https://opencritic.com/search?criteria=${encodeURIComponent(activeGameTitle)}" target="_blank" rel="noopener noreferrer">OpenCritic ↗</a>
      <a class="panax-badge panax-badge-mc" href="https://www.metacritic.com/search/${encodeURIComponent(activeGameTitle)}/" target="_blank" rel="noopener noreferrer">Metacritic ↗</a>
    `;
  }

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

function renderSteamStoreCard(steam, settings = {}) {
  if (!steam) return '';

  let priceHtml = '';
  if (steam.priceFormatted) {
    const showRub = settings.showPriceConvert !== false && steam.approxRub;
    priceHtml = `
      <div class="panax-price-row">
        ${steam.discountPercent > 0 ? `<span class="panax-discount-pill">-${steam.discountPercent}%</span>` : ''}
        <span class="panax-price-val">${steam.priceFormatted}</span>
        ${showRub ? `<span class="panax-approx-rub">~ ${steam.approxRub.toLocaleString('ru-RU')} ₽</span>` : ''}
      </div>
    `;
  }

  let reviewHtml = '';
  if (steam.reviewPercent != null) {
    const desc = steam.reviewScoreDesc ? ` · ${steam.reviewScoreDesc}` : '';
    reviewHtml = `
      <div class="panax-review-badge">
        <span>👍 ${steam.reviewPercent}% рекомендуют (${steam.reviewCount?.toLocaleString('ru-RU')} отзывов)${desc}</span>
      </div>
    `;
  } else if (steam.reviewCount) {
    reviewHtml = `
      <div class="panax-review-badge">
        <span>👍 ${steam.reviewCount.toLocaleString('ru-RU')} отзывов в Steam</span>
      </div>
    `;
  }

  let tagsHtml = '';
  const tags = [...(steam.genres || []), ...(steam.categories || [])].slice(0, 10);
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
  } else {
    links.push(`<a class="panax-quick-btn" href="https://opencritic.com/search?criteria=${encTitle}" target="_blank" rel="noopener noreferrer">OpenCritic</a>`);
  }

  if (mc?.url) {
    links.push(`<a class="panax-quick-btn" href="${mc.url}" target="_blank" rel="noopener noreferrer">Metacritic</a>`);
  } else {
    links.push(`<a class="panax-quick-btn" href="https://www.metacritic.com/search/${encTitle}/" target="_blank" rel="noopener noreferrer">Metacritic</a>`);
  }

  links.push(`<a class="panax-quick-btn" href="https://www.youtube.com/results?search_query=${encTitle}+gameplay+trailer" target="_blank" rel="noopener noreferrer">YouTube</a>`);
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
  } else {
    onlineBadge = `
      <div class="panax-online-badge" style="background: rgba(255, 255, 255, 0.05); color: #9ca3af; border-color: rgba(255, 255, 255, 0.1);">
        <span class="panax-online-dot" style="background: #6b7280; box-shadow: none;"></span>
        <span>Steam: Онлайн недоступен</span>
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

  const breakdown = parsePanaxCommunityNumbers();
  let progressHtml = '';
  if (breakdown && breakdown.totalActive > 0) {
    const beatenPct = Math.round((breakdown.beaten / breakdown.totalActive) * 100) || 0;
    const playingPct = Math.round((breakdown.playing / breakdown.totalActive) * 100) || 0;
    const backlogPct = Math.round((breakdown.backlog / breakdown.totalActive) * 100) || 0;
    const pausedPct = Math.round((breakdown.paused / breakdown.totalActive) * 100) || 0;
    const droppedPct = Math.round((breakdown.dropped / breakdown.totalActive) * 100) || 0;

    progressHtml = `
      <div class="panax-progress-bar-container">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom: 0.4rem;">
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
  const html = document.body?.innerHTML || '';

  const mBeaten = html.match(/"status_beaten_cnt":\s*(\d+)/);
  const mPlaying = html.match(/"status_playing_cnt":\s*(\d+)/);
  const mBacklog = html.match(/"status_backlog_cnt":\s*(\d+)/);
  const mPaused = html.match(/"status_paused_cnt":\s*(\d+)/);
  const mQuit = html.match(/"status_quit_cnt":\s*(\d+)/);
  const mWishlist = html.match(/"status_wishlist_cnt":\s*(\d+)/);
  const mTotal = html.match(/"status_total_cnt":\s*(\d+)/);

  if (mBeaten || mPlaying || mBacklog || mTotal) {
    const beaten = Number(mBeaten?.[1] || 0);
    const playing = Number(mPlaying?.[1] || 0);
    const backlog = Number(mBacklog?.[1] || 0);
    const paused = Number(mPaused?.[1] || 0);
    const dropped = Number(mQuit?.[1] || 0);
    const wishlist = Number(mWishlist?.[1] || 0);
    const totalActive = beaten + playing + backlog + paused + dropped;
    if (totalActive > 0 || beaten > 0) {
      return { beaten, playing, backlog, paused, dropped, wishlist, totalActive: totalActive || 1 };
    }
  }

  // Fallback: parse numbers near labels in body text
  const text = document.body?.textContent || '';
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
    console.debug('[PANAX RU] Error fetching enrichments:', err);
  } finally {
    isFetching = false;
  }
}

function findMountTarget(tab) {
  if (tab === 'about') {
    const hltb = findSectionCard(['how long to beat']);
    if (hltb?.parentElement) {
      return { parent: hltb.parentElement, before: hltb.nextSibling };
    }
    const plat = findSectionCard(['платформы', 'platforms']);
    if (plat?.parentElement) {
      return { parent: plat.parentElement, before: plat.nextSibling };
    }
  }

  if (tab === 'players') {
    const players = findSectionCard(['игроки с этой игрой', 'players with this game']);
    if (players?.parentElement) {
      return { parent: players.parentElement, before: players.nextSibling };
    }
    const rate = findSectionCard(['как вам?', 'how was it?']);
    if (rate?.parentElement) {
      return { parent: rate.parentElement, before: rate.nextSibling };
    }
    const ratingsSec = findSectionCard(['оценки', 'ratings']);
    if (ratingsSec?.parentElement) {
      return { parent: ratingsSec.parentElement, before: ratingsSec.nextSibling };
    }
  }

  // Fallback: search for container under tab row
  const tabCandidates = document.querySelectorAll('button, [role="tab"], div, a, span');
  for (const btn of tabCandidates) {
    const t = (btn.textContent || '').trim().toLowerCase();
    if (t === 'о игре' || t === 'about' || t === 'данные игроков' || t === 'player data') {
      const tabsRow = btn.closest('div[class*="flex"], div[class*="tabs"], nav') || btn.parentElement;
      if (tabsRow?.parentElement) {
        const next = tabsRow.nextElementSibling;
        if (next && next !== tabsRow) return { parent: next, before: null };
      }
    }
  }

  const mainDiv = document.querySelector('body > div');
  return { parent: mainDiv || document.body, before: null };
}

function injectUi() {
  if (!location.pathname.includes('/game-detail/')) return;
  const currentTitle = getGameTitleFromDom();
  if (!currentTitle) return;

  const settings = getSettings();
  const tab = getActiveTab();

  if (tab === 'about') {
    document.getElementById('panax-players-card-container')?.remove();

    if (!document.getElementById('panax-about-enrichment')) {
      const target = findMountTarget('about');
      if (target?.parent) {
        const container = document.createElement('div');
        container.id = 'panax-about-enrichment';

        let html = '';
        if (settings.showRatings !== false) {
          html += renderRatingsCard(activeOcData, activeMcData, activeSteamData, activeProtonData);
        }
        if (settings.showSteamStore !== false) {
          html += renderSteamStoreCard(activeSteamData, settings);
        }
        if (settings.showQuickLinks !== false) {
          html += renderQuickLinks(currentTitle, activeSteamData, activeOcData, activeMcData);
        }

        if (html.trim()) {
          container.innerHTML = html;
          target.parent.insertBefore(container, target.before);
        }
      }
    }
  } else if (tab === 'players') {
    document.getElementById('panax-about-enrichment')?.remove();

    if (!document.getElementById('panax-players-card-container')) {
      if (settings.showPlayerStats !== false) {
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
}

export async function startEnrichment() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

  await loadSettings();

  // Instant update on popup toggle
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        loadSettings().then(() => {
          document.getElementById('panax-about-enrichment')?.remove();
          document.getElementById('panax-players-card-container')?.remove();
          injectUi();
        });
      }
    });
  }

  let lastUrl = location.href;

  function tick() {
    if (!location.pathname.includes('/game-detail/')) {
      document.getElementById('panax-about-enrichment')?.remove();
      document.getElementById('panax-players-card-container')?.remove();
      activeGameTitle = '';
      return;
    }

    const title = getGameTitleFromDom();
    if (title && title !== activeGameTitle) {
      activeGameTitle = title;
      loadGameData(title).then(() => injectUi());
    } else {
      injectUi();
    }
  }

  window.addEventListener('popstate', tick);
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(tick, 100);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    origReplaceState.apply(this, args);
    setTimeout(tick, 100);
  };

  tick();

  let timer = null;
  const obs = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        tick();
      } else if (location.pathname.includes('/game-detail/')) {
        tick();
      }
    }, 150);
  });

  obs.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
}
