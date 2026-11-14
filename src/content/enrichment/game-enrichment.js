import { fetchOpenCritic } from "../api/opencritic.js";
import { fetchMetacritic } from "../api/metacritic.js";
import { fetchProtonDb } from "../api/protondb.js";
import { getSettings, loadSettings } from "../settings.js";
import { resolveSteam, fetchSteamCharts } from "../api/steam.js";
import { fetchBackloggdRating } from "../api/backloggd.js";

var activeGameTitle = "";
var activeSteamData = null;
var activeSteamCharts = null;
var activeOcData = null;
var activeMcData = null;
var activeProtonData = null;
var activeBackloggdData = null;
var isFetching = false;
var userSelectedTab = null;
function isGamePage() {
  const p = location.pathname;
  return p.includes("/game-detail/");
}
function hookTabClicks() {
  const elements = document.querySelectorAll('button, a, div, span, [role="tab"]');
  for (const el of elements) {
    if (el.children.length > 3) continue;
    const t = (el.textContent || "").trim().toLowerCase();
    if (t === "\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432" || t === "player data") {
      if (!el.dataset.panaxHooked) {
        el.dataset.panaxHooked = "1";
        el.addEventListener("click", () => {
          userSelectedTab = "players";
          injectUi();
          setTimeout(injectUi, 40);
        });
      }
    } else if (t === "\u043E \u0438\u0433\u0440\u0435" || t === "about") {
      if (!el.dataset.panaxHooked) {
        el.dataset.panaxHooked = "1";
        el.addEventListener("click", () => {
          userSelectedTab = "about";
          injectUi();
          setTimeout(injectUi, 40);
        });
      }
    } else if (t === "\u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E" || t === "community") {
      if (!el.dataset.panaxHooked) {
        el.dataset.panaxHooked = "1";
        el.addEventListener("click", () => {
          userSelectedTab = "community";
          injectUi();
          setTimeout(injectUi, 40);
        });
      }
    }
  }
}
function getGameTitleFromDom() {
  const titleTag = document.title || "";
  const fromTitle = titleTag.replace(/\s*\|\s*PANAX.*$/i, "").trim();
  if (fromTitle && fromTitle !== "PANAX") return fromTitle;
  const h1 = document.querySelector("h1");
  if (h1 && h1.textContent?.trim()) return h1.textContent.trim();
  const metaOg = document.querySelector('meta[property="og:title"]');
  if (metaOg?.content) {
    const t = metaOg.content.replace(/\s*\|\s*PANAX.*$/i, "").trim();
    if (t && t !== "PANAX") return t;
  }
  const header = document.querySelector('div[class*="text-2xl"], div[class*="text-xl"], h2');
  if (header && header.textContent?.trim()) {
    const text = header.textContent.trim();
    if (text.length < 80 && !text.includes("\n")) return text;
  }
  return "";
}
function findSectionCard(keywords) {
  const normKeywords = keywords.map((k) => k.toLowerCase());
  const elements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p");
  for (const el of elements) {
    if (el.children.length > 3) continue;
    const text = (el.textContent || "").trim().toLowerCase();
    if (!text) continue;
    for (const kw of normKeywords) {
      if (text === kw || text.startsWith(kw)) {
        let cur = el;
        let bestCard = el.parentElement;
        while (cur && cur.parentElement && cur.parentElement !== document.body) {
          const p = cur.parentElement;
          if (p === document.body) break;
          const cls = cur.className || "";
          if (cur.tagName === "SECTION" || /rounded|bg-|space-y|border|card/i.test(cls)) {
            const h2 = cur.offsetHeight || cur.getBoundingClientRect().height;
            if (h2 > 40 && h2 < 1400) {
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
function findTabsBar() {
  const bars = document.querySelectorAll("div, nav");
  for (const bar of bars) {
    if (bar.children.length >= 2 && bar.children.length <= 6) {
      const t = (bar.textContent || "").toLowerCase();
      const hasPlayersTab = t.includes("\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432") || t.includes("player data");
      const hasAboutTab = t.includes("\u043E \u0438\u0433\u0440\u0435") || t.includes("about");
      if (hasPlayersTab && hasAboutTab) return bar;
    }
  }
  return null;
}
function getActiveTab() {
  if (userSelectedTab) return userSelectedTab;
  const tabsBar = findTabsBar();
  const candidates = document.querySelectorAll("h1, h2, h3, h4, div, span, p");
  for (const h2 of candidates) {
    if (h2.children.length > 2) continue;
    const txt = (h2.textContent || "").trim().toLowerCase();
    if (tabsBar && h2.compareDocumentPosition(tabsBar) & Node.DOCUMENT_POSITION_FOLLOWING) {
      continue;
    }
    if (txt === "how long to beat") {
      if (h2.offsetParent !== null && h2.getBoundingClientRect().height > 0) return "about";
    }
    if (txt.startsWith("\u043A\u0430\u043A \u0432\u0430\u043C?") || txt.startsWith("how was it?") || txt.startsWith("\u0438\u0433\u0440\u043E\u043A\u0438 \u0441 \u044D\u0442\u043E\u0439 \u0438\u0433\u0440\u043E\u0439") || txt.startsWith("players with this game")) {
      if (h2.offsetParent !== null && h2.getBoundingClientRect().height > 0) return "players";
    }
  }
  if (tabsBar) {
    for (const tabEl of tabsBar.children) {
      const tabText = (tabEl.textContent || "").toLowerCase();
      const cls = String(tabEl.className || "");
      const isAria = tabEl.getAttribute("aria-selected") === "true" || tabEl.getAttribute("data-state") === "active";
      const hasUnderline = !!tabEl.querySelector('div[class*="bg-white"], div[class*="border"], span[class*="border"], hr');
      const isBrightWhite = /\btext-white\b(?!\/)/.test(cls) && !/\b(?:text-white\/\d+|opacity-\d+)\b/.test(cls);
      if (isAria || hasUnderline || isBrightWhite) {
        if (tabText.includes("\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432") || tabText.includes("player data")) {
          return "players";
        }
        if (tabText.includes("\u043E \u0438\u0433\u0440\u0435") || tabText.includes("about")) {
          return "about";
        }
        if (tabText.includes("\u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E") || tabText.includes("community")) {
          return "community";
        }
      }
    }
  }
  return "about";
}
function renderRatingsCard(oc, mc, steam, proton, bl) {
  let badgesHtml = "";
  if (oc?.tier) {
    const tierClass = (oc.tier || "").toLowerCase();
    const scoreText = oc.score ? ` \xB7 ${oc.score}` : "";
    const recText = oc.percentRecommended ? ` (${oc.percentRecommended}% \u0440\u0435\u043A\u043E\u043C.)` : "";
    badgesHtml += `
    <a class="panax-badge panax-badge-oc ${tierClass}" href="${oc.url}" target="_blank" rel="noopener noreferrer" title="OpenCritic Score">
      <span>OpenCritic: <strong>${oc.tier}${scoreText}</strong>${recText}</span>
    </a>
  `;
  }
  if (mc?.score != null) {
    const s = mc.score;
    const tier = s >= 75 ? "high" : s >= 50 ? "mid" : "low";
    badgesHtml += `
    <a class="panax-badge panax-badge-mc" href="${mc.url}" target="_blank" rel="noopener noreferrer" title="Metascore">
      <span class="mc-val ${tier}">${s}</span>
      <span>Metacritic</span>
    </a>
  `;
  }
  if (steam?.reviewPercent != null) {
    badgesHtml += `
    <a class="panax-badge panax-badge-steam" href="${steam.url}#app_reviews_hash" target="_blank" rel="noopener noreferrer" title="\u041E\u0446\u0435\u043D\u043A\u0438 \u0432 Steam">
      <span>\u{1F44D} Steam: <strong>${steam.reviewPercent}%</strong></span>
    </a>
  `;
  }
  if (bl?.rating) {
    badgesHtml += `
    <a class="panax-badge panax-badge-backloggd" href="${bl.url}" target="_blank" rel="noopener noreferrer" title="\u041E\u0446\u0435\u043D\u043A\u0430 \u043D\u0430 Backloggd">
      <span>\u2605 <strong>${bl.rating}</strong> Backloggd</span>
    </a>
  `;
  }
  if (steam?.steamDeckStatus) {
    badgesHtml += `
    <span class="panax-badge panax-badge-deck" title="\u0421\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C \u0441\u043E Steam Deck">
      <span>\u{1F3AE} Steam Deck: ${steam.steamDeckStatus}</span>
    </span>
  `;
  }
  if (proton?.tier) {
    const tierLower = proton.tier.toLowerCase();
    const tierUpper = proton.tier.toUpperCase();
    badgesHtml += `
    <a class="panax-badge panax-badge-proton ${tierLower}" href="${proton.url}" target="_blank" rel="noopener noreferrer" title="ProtonDB Tier">
      <span>\u{1F427} ProtonDB: ${tierUpper}</span>
    </a>
  `;
  }
  if (!badgesHtml) {
    badgesHtml = `
    <span style="font-size: 0.85rem; color: #9ca3af; margin-right: 0.5rem;">\u041E\u0446\u0435\u043D\u043A\u0438 \u043A\u0440\u0438\u0442\u0438\u043A\u043E\u0432:</span>
    <a class="panax-badge panax-badge-oc" href="https://opencritic.com/search?criteria=${encodeURIComponent(activeGameTitle)}" target="_blank" rel="noopener noreferrer">OpenCritic \u2197</a>
    <a class="panax-badge panax-badge-mc" href="https://www.metacritic.com/search/${encodeURIComponent(activeGameTitle)}/" target="_blank" rel="noopener noreferrer">Metacritic \u2197</a>
  `;
  }
  return `
  <div class="panax-plus-card" id="panax-ratings-card">
    <div class="panax-plus-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      <span>\u041E\u0446\u0435\u043D\u043A\u0438 \u043A\u0440\u0438\u0442\u0438\u043A\u043E\u0432 \u0438 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C</span>
    </div>
    <div class="panax-badges-row">
      ${badgesHtml}
    </div>
  </div>
`;
}
function renderSteamStoreCard(steam, settings = {}) {
  if (!steam) return "";
  let priceHtml = "";
  if (steam.priceFormatted) {
    const converted = steam.convertedPrice?.formatted;
    const showConverted = settings.showPriceConvert !== false && converted;
    priceHtml = `
    <div class="panax-price-row">
      ${steam.discountPercent > 0 ? `<span class="panax-discount-pill">-${steam.discountPercent}%</span>` : ""}
      <span class="panax-price-val">${steam.priceFormatted}</span>
      ${showConverted ? `<span class="panax-approx-rub">${converted}</span>` : ""}
    </div>
  `;
  }
  let reviewHtml = "";
  if (steam.reviewPercent != null) {
    const desc = steam.reviewScoreDesc ? ` \xB7 ${steam.reviewScoreDesc}` : "";
    reviewHtml = `
    <div class="panax-review-badge">
      <span>\u{1F44D} ${steam.reviewPercent}% \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E\u0442 (${steam.reviewCount?.toLocaleString("ru-RU")} \u043E\u0442\u0437\u044B\u0432\u043E\u0432)${desc}</span>
    </div>
  `;
  } else if (steam.reviewCount) {
    reviewHtml = `
    <div class="panax-review-badge">
      <span>\u{1F44D} ${steam.reviewCount.toLocaleString("ru-RU")} \u043E\u0442\u0437\u044B\u0432\u043E\u0432 \u0432 Steam</span>
    </div>
  `;
  }
  let tagsHtml = "";
  const tags = [...steam.genres || [], ...steam.categories || []].slice(0, 10);
  if (tags.length) {
    tagsHtml = `
    <div class="panax-tags-row">
      ${tags.map((t) => `<span class="panax-tag">${t}</span>`).join("")}
    </div>
  `;
  }
  return `
  <div class="panax-plus-card" id="panax-steam-card">
    <div class="panax-plus-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      <span>\u041C\u0430\u0433\u0430\u0437\u0438\u043D Steam</span>
    </div>
    <div class="panax-steam-box">
      ${priceHtml}
      ${reviewHtml}
      ${tagsHtml}
    </div>
  </div>
`;
}
function renderQuickLinks(title, steam, oc, mc, bl) {
  const encTitle = encodeURIComponent(title);
  const links = [];
  if (steam?.url) {
    links.push(`<a class="panax-quick-btn" href="${steam.url}" target="_blank" rel="noopener noreferrer">Steam</a>`);
    links.push(`<a class="panax-quick-btn" href="https://steamdb.info/app/${steam.appId}/" target="_blank" rel="noopener noreferrer">SteamDB</a>`);
  }
  links.push(`<a class="panax-quick-btn" href="https://www.pcgamingwiki.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}" target="_blank" rel="noopener noreferrer">PCGamingWiki</a>`);
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
  if (bl?.url) {
    links.push(`<a class="panax-quick-btn" href="${bl.url}" target="_blank" rel="noopener noreferrer">Backloggd</a>`);
  }
  links.push(`<a class="panax-quick-btn" href="https://www.youtube.com/results?search_query=${encTitle}+gameplay+trailer" target="_blank" rel="noopener noreferrer">YouTube</a>`);
  links.push(`<a class="panax-quick-btn" href="https://www.igdb.com/search?q=${encTitle}" target="_blank" rel="noopener noreferrer">IGDB</a>`);
  return `
  <div class="panax-plus-card" id="panax-quick-links-card">
    <div class="panax-plus-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
      <span>\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438</span>
    </div>
    <div class="panax-quick-links">
      ${links.join("")}
    </div>
  </div>
`;
}
function renderPlayerStatsCard(steam, charts) {
  let onlineBadge = "";
  if (steam?.currentPlayers != null) {
    onlineBadge = `
    <div class="panax-online-badge">
      <span class="panax-online-dot"></span>
      <span>${steam.currentPlayers.toLocaleString("ru-RU")} \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u043E\u043D\u043B\u0430\u0439\u043D (Steam)</span>
    </div>
  `;
  } else if (isFetching) {
    onlineBadge = `
    <div class="panax-online-badge" style="background: rgba(255, 255, 255, 0.05); color: #9ca3af; border-color: rgba(255, 255, 255, 0.1);">
      <span class="panax-online-dot" style="background: #eab308; box-shadow: none;"></span>
      <span>Steam: \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u043E\u043D\u043B\u0430\u0439\u043D\u0430...</span>
    </div>
  `;
  } else {
    onlineBadge = `
    <div class="panax-online-badge" style="background: rgba(255, 255, 255, 0.05); color: #9ca3af; border-color: rgba(255, 255, 255, 0.1);">
      <span class="panax-online-dot" style="background: #6b7280; box-shadow: none;"></span>
      <span>Steam: \u041E\u043D\u043B\u0430\u0439\u043D \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D</span>
    </div>
  `;
  }
  let statsGrid = "";
  if (charts?.peak24h || charts?.allTimePeak) {
    statsGrid = `
    <div class="panax-steam-stats-grid">
      ${charts.peak24h ? `
        <div class="panax-stat-box">
          <span class="label">\u041F\u0438\u043A \u0437\u0430 24 \u0447\u0430\u0441\u0430</span>
          <span class="val">${charts.peak24h.toLocaleString("ru-RU")}</span>
        </div>
      ` : ""}
      ${charts.allTimePeak ? `
        <div class="panax-stat-box">
          <span class="label">\u0420\u0435\u043A\u043E\u0440\u0434 \u043E\u043D\u043B\u0430\u0439\u043D\u0430</span>
          <span class="val">${charts.allTimePeak.toLocaleString("ru-RU")}</span>
        </div>
      ` : ""}
    </div>
  `;
  }
  return `
  <div class="panax-plus-card" id="panax-players-card">
    <div class="panax-plus-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      <span>\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0430 \u0438 \u0438\u0433\u0440\u043E\u043A\u043E\u0432</span>
    </div>
    ${onlineBadge}
    ${statsGrid}
  </div>
`;
}
async function loadGameData(title) {
  if (isFetching || !title) return;
  isFetching = true;
  try {
    const [steamRes, ocRes, mcRes, blRes] = await Promise.allSettled([
      resolveSteam(title),
      fetchOpenCritic(title),
      fetchMetacritic(title),
      fetchBackloggdRating(title)
    ]);
    activeSteamData = steamRes.status === "fulfilled" ? steamRes.value : null;
    activeOcData = ocRes.status === "fulfilled" ? ocRes.value : null;
    activeMcData = mcRes.status === "fulfilled" ? mcRes.value : null;
    activeBackloggdData = blRes.status === "fulfilled" ? blRes.value : null;
    if (activeSteamData?.appId) {
      const [protonRes, chartsRes] = await Promise.allSettled([
        fetchProtonDb(activeSteamData.appId),
        fetchSteamCharts(activeSteamData.appId)
      ]);
      activeProtonData = protonRes.status === "fulfilled" ? protonRes.value : null;
      activeSteamCharts = chartsRes.status === "fulfilled" ? chartsRes.value : null;
    }
  } catch (err) {
    console.debug("[PANAX RU] Error fetching enrichments:", err);
  } finally {
    isFetching = false;
    injectUi();
  }
}
function findMountTarget(tab) {
  if (tab === "about") {
    const hltb = findSectionCard(["how long to beat"]);
    if (hltb?.parentElement) {
      return { parent: hltb.parentElement, before: hltb.nextSibling };
    }
    const plat = findSectionCard(["\u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B", "platforms"]);
    if (plat?.parentElement) {
      return { parent: plat.parentElement, before: plat.nextSibling };
    }
    const errReport = findSectionCard(["\u043D\u0430\u0448\u043B\u0438 \u043E\u0448\u0438\u0431\u043A\u0443", "\u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u043A\u0443", "suggest edit", "found an error"]);
    if (errReport?.parentElement) {
      return { parent: errReport.parentElement, before: errReport.nextSibling };
    }
    const descSec = findSectionCard(["\u043E\u0431 \u0438\u0433\u0440\u0435", "about game", "\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435"]);
    if (descSec?.parentElement) {
      return { parent: descSec.parentElement, before: descSec.nextSibling };
    }
  }
  if (tab === "players") {
    const players = findSectionCard(["\u0438\u0433\u0440\u043E\u043A\u0438 \u0441 \u044D\u0442\u043E\u0439 \u0438\u0433\u0440\u043E\u0439", "players with this game"]);
    if (players?.parentElement) {
      return { parent: players.parentElement, before: players };
    }
    const rate = findSectionCard(["\u043A\u0430\u043A \u0432\u0430\u043C?", "how was it?"]);
    if (rate?.parentElement) {
      return { parent: rate.parentElement, before: rate };
    }
    const ratingsSec = findSectionCard(["\u043E\u0446\u0435\u043D\u043A\u0438", "ratings"]);
    if (ratingsSec?.parentElement) {
      return { parent: ratingsSec.parentElement, before: ratingsSec };
    }
    const tabsBar = findTabsBar();
    if (tabsBar?.parentElement) {
      const next = tabsBar.nextElementSibling;
      if (next && next !== tabsBar) {
        return { parent: next, before: next.firstChild };
      }
      return { parent: tabsBar.parentElement, before: tabsBar.nextSibling };
    }
  }
  const tabCandidates = document.querySelectorAll('button, [role="tab"], div, a, span');
  for (const btn of tabCandidates) {
    const t = (btn.textContent || "").trim().toLowerCase();
    if (t === "\u043E \u0438\u0433\u0440\u0435" || t === "about" || t === "\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432" || t === "player data") {
      const tabsRow = btn.closest('div[class*="flex"], div[class*="tabs"], nav') || btn.parentElement;
      if (tabsRow?.parentElement) {
        const next = tabsRow.nextElementSibling;
        if (next && next !== tabsRow) return { parent: next, before: null };
      }
    }
  }
  return null;
}
function injectUi() {
  const settings = getSettings();
  if (!isGamePage() || settings.showGameWidgets === false) {
    document.getElementById("panax-about-enrichment")?.remove();
    document.getElementById("panax-players-card-container")?.remove();
    return;
  }
  const currentTitle = getGameTitleFromDom();
  if (!currentTitle) return;
  hookTabClicks();
  const tab = getActiveTab();
  if (tab === "about") {
    document.getElementById("panax-players-card-container")?.remove();
    if (settings.showRatings !== false || settings.showSteamStore !== false || settings.showQuickLinks !== false) {
      const target = findMountTarget("about");
      if (target?.parent) {
        let container = document.getElementById("panax-about-enrichment");
        if (!container) {
          container = document.createElement("div");
          container.id = "panax-about-enrichment";
          target.parent.insertBefore(container, target.before);
        } else if (!container.isConnected || container.parentElement !== target.parent) {
          target.parent.insertBefore(container, target.before);
        }
        let html = "";
        if (settings.showRatings !== false) {
          html += renderRatingsCard(activeOcData, activeMcData, activeSteamData, activeProtonData, activeBackloggdData);
        }
        if (settings.showSteamStore !== false) {
          html += renderSteamStoreCard(activeSteamData, settings);
        }
        if (settings.showQuickLinks !== false) {
          html += renderQuickLinks(currentTitle, activeSteamData, activeOcData, activeMcData, activeBackloggdData);
        }
        if (html.trim() && container.innerHTML !== html) {
          container.innerHTML = html;
        }
      }
    }
  } else if (tab === "players") {
    document.getElementById("panax-about-enrichment")?.remove();
    if (settings.showPlayerStats !== false) {
      const target = findMountTarget("players");
      if (target?.parent) {
        let container = document.getElementById("panax-players-card-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "panax-players-card-container";
          target.parent.insertBefore(container, target.before);
        } else if (!container.isConnected || container.parentElement !== target.parent) {
          target.parent.insertBefore(container, target.before);
        }
        const html = renderPlayerStatsCard(activeSteamData, activeSteamCharts);
        if (container.innerHTML !== html) {
          container.innerHTML = html;
        }
      }
    }
  } else if (tab === "community") {
    document.getElementById("panax-about-enrichment")?.remove();
    document.getElementById("panax-players-card-container")?.remove();
  }
}
export async function startEnrichment() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
  await loadSettings();
  document.addEventListener(
    "click",
    (e) => {
      let cur = e.target;
      let depth = 0;
      while (cur && depth < 5 && cur !== document.body) {
        const t = (cur.textContent || "").trim().toLowerCase();
        if (t === "\u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432" || t === "player data") {
          userSelectedTab = "players";
          document.getElementById("panax-about-enrichment")?.remove();
          injectUi();
          setTimeout(injectUi, 40);
          setTimeout(injectUi, 200);
          break;
        } else if (t === "\u043E \u0438\u0433\u0440\u0435" || t === "about") {
          userSelectedTab = "about";
          document.getElementById("panax-players-card-container")?.remove();
          injectUi();
          setTimeout(injectUi, 40);
          setTimeout(injectUi, 200);
          break;
        } else if (t === "\u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E" || t === "community") {
          userSelectedTab = "community";
          document.getElementById("panax-about-enrichment")?.remove();
          document.getElementById("panax-players-card-container")?.remove();
          injectUi();
          break;
        }
        cur = cur.parentElement;
        depth += 1;
      }
    },
    true
  );
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        loadSettings().then(() => {
          document.getElementById("panax-about-enrichment")?.remove();
          document.getElementById("panax-players-card-container")?.remove();
          injectUi();
        });
      }
    });
  }
  let lastUrl = location.href;
  function tick2() {
    if (!isGamePage()) {
      document.getElementById("panax-about-enrichment")?.remove();
      document.getElementById("panax-players-card-container")?.remove();
      activeGameTitle = "";
      userSelectedTab = null;
      return;
    }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      userSelectedTab = null;
    }
    const title = getGameTitleFromDom();
    if (title && title !== activeGameTitle) {
      activeGameTitle = title;
      activeSteamData = null;
      activeSteamCharts = null;
      activeOcData = null;
      activeMcData = null;
      activeProtonData = null;
      activeBackloggdData = null;
      userSelectedTab = null;
      loadGameData(title).then(() => injectUi());
    } else {
      injectUi();
    }
  }
  window.addEventListener("popstate", tick2);
  const origPushState = history.pushState;
  history.pushState = function(...args) {
    origPushState.apply(this, args);
    setTimeout(tick2, 100);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    origReplaceState.apply(this, args);
    setTimeout(tick2, 100);
  };
  tick2();
  let timer = null;
  const obs = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        tick2();
      } else if (isGamePage()) {
        tick2();
      }
    }, 150);
  });
  obs.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}
