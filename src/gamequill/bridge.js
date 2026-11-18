import { MAX_DATA_IMAGE, MAX_UPLOAD_BYTES, toPublicPanaxImageUrl, safeUserImageUrl, base64ToBytes, isRasterImageType, isGifBytes, shouldPreserveAnimation, MAX_GALLERY_ITEMS, inspectImageBytes, FLAT_GIF_HINT, bytesToBase64, normalizeExternalGifUrl, probeImageLoad, compressImage } from "../shared/gq-image.js";
import { str, safeUrl, safeImageUrl, safeColor, normalizeReview, hasContent } from "../shared/gq-schema.js";
import { DEMO_CONFIRM, DEMO_GAME, makeDemoReview, applyDemoReview } from "../shared/gq-demo.js";
import { sanitizeHtml } from "../shared/gq-html.js";
import { FOOTER_TEXT, FOOTER_TEXT_EN, buildFallback, attachCarriers, opsToHtml } from "../shared/gq-fallback.js";
import { VS_MAX_CHARS, encodeDoc, vsEncode } from "../shared/gq-payload.js";
import { paletteFor } from "../shared/gq-cover.js";
import { DEFAULT_THEME, normalizeTheme, themeList } from "../shared/gq-theme.js";
import { EXTRA_VARIANTS, renderExtraGameCard, isPanaxCardVariant } from "../shared/gq-cards.js";
import { plain, toEditorReview, cleanInteg, buildIntegMap, steamCover, ytCover, panaxCoverUrl, adaptSteamSearch, adaptSteamDetails, adaptPanaxSearch, steamWidgetPatch, mergeDetails } from "./bridge-core.js";
import { buildImportUrlCandidates, parseImportedReview } from "./review-importer.js";

var ALLOWED_PARENTS = ["https://panaxgames.com", "https://www.panaxgames.com"];
if (false) {
  ALLOWED_PARENTS.push("http://localhost:8765", "http://127.0.0.1:8765");
  setAllowedImageOrigins(["http://localhost:8765", "http://127.0.0.1:8765"]);
}
function stripLocalImageBlocks(doc) {
  if (!doc || !Array.isArray(doc.blocks)) return false;
  const before = doc.blocks.length;
  doc.blocks = doc.blocks.filter((b) => !(b.type === "image" && b.data && String(b.data.url || "").startsWith("data:")));
  return doc.blocks.length !== before;
}
var uploadPending = /* @__PURE__ */ new Map();
var uploadSeq = 0;
function uploadImage(payload) {
  const reqId = "u" + ++uploadSeq;
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      uploadPending.delete(reqId);
      resolve({ ok: false, code: "timeout", error: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 \u043D\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \u0438 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 panaxgames.com." });
    }, 6e4);
    uploadPending.set(reqId, (res) => {
      clearTimeout(t);
      resolve(res);
    });
    window.GQ.post({ type: "gq:upload-image", reqId, name: payload.name || "", contentType: payload.contentType, width: payload.width || 0, height: payload.height || 0, b64: payload.b64 });
  });
}
function onUploadResult(m) {
  const fn = m && m.reqId && uploadPending.get(m.reqId);
  if (!fn) return;
  uploadPending.delete(m.reqId);
  fn(m);
}
function detectParent() {
  if (window.parent === window) return null;
  try {
    const ao = location.ancestorOrigins;
    const o = ao && ao.length ? ao[0] : "";
    return ALLOWED_PARENTS.includes(o) ? o : null;
  } catch {
    return null;
  }
}
var parentOrigin = detectParent();
var clean = (h) => sanitizeHtml(h, window);
async function fetchExternalImageB64(url) {
  if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.sendMessage === "function") {
    const res = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "panax_xhr_blob", url }, (r) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(r || null);
        });
      } catch {
        resolve(null);
      }
    });
    if (res && res.success && res.b64) {
      return { b64: res.b64, contentType: res.contentType || "image/jpeg" };
    }
  }
  return null;
}
function isPanaxHostedImage(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === "panaxgames.com" || h.endsWith(".panaxgames.com") || h.includes("gamedb-oz.s3");
  } catch {
    return false;
  }
}
function measureB64Image(b64, ct) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const t = setTimeout(() => resolve({ width: 1280, height: 720 }), 3000);
      img.onload = () => {
        clearTimeout(t);
        resolve({ width: img.naturalWidth || 1280, height: img.naturalHeight || 720 });
      };
      img.onerror = () => {
        clearTimeout(t);
        resolve({ width: 1280, height: 720 });
      };
      img.src = `data:${ct};base64,${b64}`;
    } catch {
      resolve({ width: 1280, height: 720 });
    }
  });
}
async function uploadExternalAttachments(doc, maxCount = 10) {
  const urls = [];
  const seen = new Set();
  for (const b of doc.blocks || []) {
    if (b.type !== "image" || !b.data) continue;
    const d = b.data;
    const items = Array.isArray(d.items) && d.items.length ? d.items : d.url ? [d] : [];
    for (const it of items) {
      const u = safeUserImageUrl(it && it.url);
      if (!u || !/^https?:/i.test(u) || isPanaxHostedImage(u) || seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      if (urls.length >= maxCount) break;
    }
    if (urls.length >= maxCount) break;
  }
  const map = {};
  for (const u of urls) {
    try {
      const dl = await fetchExternalImageB64(u);
      if (!dl || !dl.b64) continue;
      const ct = /^image\/(png|jpeg|jpg|webp|gif)/i.test(dl.contentType) ? dl.contentType.split(";")[0].trim() : "image/jpeg";
      const dim = await measureB64Image(dl.b64, ct);
      const up = await uploadImage({ name: "attachment", contentType: ct, b64: dl.b64, width: dim.width, height: dim.height });
      if (up && up.ok && up.url) map[u] = up.url;
    } catch {
    }
  }
  return map;
}
async function exportForPost(review, settings, win = window) {
  const s = settings || {};
  const author = s.author && s.author !== "\u0412\u0430\u0448\u0435 \u0438\u043C\u044F" ? s.author : "";
  const integ = buildIntegMap(review, s.integrations);
  const doc = normalizeReview({ ...review, author, integ, updatedAt: Date.now() }, { sanitizeHtml: (h) => sanitizeHtml(h, win) });
  if (!doc || !hasContent(doc)) throw Object.assign(new Error("\u041E\u0431\u0437\u043E\u0440 \u043F\u0443\u0441\u0442\u043E\u0439"), { code: "empty" });
  const attachExternalImages = !!s.attachExternalImages;
  const attachedMap = attachExternalImages ? await uploadExternalAttachments(doc, 10) : null;
  const fbOpts = { win, attachExternalImages, attachedMap };
  const fb0 = buildFallback(doc, fbOpts);
  doc.fp = fb0.fp;
  let enc2;
  try {
    enc2 = await encodeDoc(doc);
  } catch (e) {
    if (!(e && e.code === "too-large")) throw e;
    const stripped = stripLocalImageBlocks(doc);
    if (!stripped) throw e;
    const fb1 = buildFallback(doc, fbOpts);
    doc.fp = fb1.fp;
    enc2 = await encodeDoc(doc);
  }
  const fb = buildFallback(doc, fbOpts);
  const vs = enc2.bytes.length <= VS_MAX_CHARS ? vsEncode(enc2.bytes) : "";
  const ops = attachCarriers(fb.ops, { text: enc2.text, vs });
  let plain2 = fb.plain;
  if (vs) {
    let i = plain2.lastIndexOf(FOOTER_TEXT);
    let flen = FOOTER_TEXT.length;
    if (i < 0) {
      i = plain2.lastIndexOf(FOOTER_TEXT_EN);
      flen = FOOTER_TEXT_EN.length;
    }
    plain2 = i >= 0 ? plain2.slice(0, i + flen) + vs + plain2.slice(i + flen) : plain2 + vs;
  }
  return {
    ops,
    plain: plain2,
    html: opsToHtml(ops),
    carrierText: enc2.text,
    fp: fb.fp,
    sizes: { raw: enc2.rawSize, compressed: enc2.compressedSize, vs: vs ? enc2.bytes.length : 0 },
    doc
  };
}
async function getJson(url) {
  const r = await fetch(url, { credentials: "omit", cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
var PANAX_ANON_TOKEN = "ad9739191285443a88dd2994ce7da73fbcf58f8d6525407989193eaebcca77d4";
var PANAX_REACTION_CNT_KEYS = [
  ["legendary", "rating_legendary_cnt"],
  ["awesome", "rating_awesome_cnt"],
  ["good", "rating_good_cnt"],
  ["decent", "rating_decent_cnt"],
  ["dislike", "rating_dislike_cnt"],
  ["awful", "rating_awful_cnt"]
];
var panaxDetCache = /* @__PURE__ */ new Map();
var panaxSearchCache = /* @__PURE__ */ new Map();

function extractBalancedJson(s, start) {
  if (!s || s[start] !== "{") return "";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
  }
  return "";
}

function extractFlightGameDetails(html) {
  if (!html) return null;
  let pos = html.indexOf("rating_legendary_cnt");
  if (pos < 0) pos = html.indexOf("gameDetails");
  if (pos >= 0) {
    const prefix = html.lastIndexOf('[1,"', pos);
    if (prefix >= 0 && pos - prefix < 250000) {
      const qStart = prefix + 3;
      let esc = false;
      let qEnd = -1;
      for (let i = qStart + 1; i < html.length; i++) {
        const c = html[i];
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') { qEnd = i; break; }
      }
      if (qEnd > qStart) {
        try {
          const decoded = JSON.parse(html.slice(qStart, qEnd + 1));
          const gdIdx = decoded.indexOf('"gameDetails":');
          if (gdIdx >= 0) {
            const brace = decoded.indexOf("{", gdIdx + 14);
            const jsonText = brace >= 0 ? extractBalancedJson(decoded, brace) : "";
            if (jsonText) return JSON.parse(jsonText);
          }
        } catch {
        }
      }
    }
  }
  const directIdx = html.indexOf('"gameDetails":');
  if (directIdx >= 0) {
    try {
      const brace = html.indexOf("{", directIdx + 14);
      const jsonText = brace >= 0 ? extractBalancedJson(html, brace) : "";
      if (jsonText) return JSON.parse(jsonText);
    } catch {
    }
  }
  return null;
}

function normTitleKey(t) {
  return String(t || "").toLowerCase().replace(/[™®©:\-–—'’"`.,!?/()\[\]]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractPanaxId(v) {
  if (!v) return "";
  if (typeof v === "object") {
    return extractPanaxId(v.panaxId || "") || extractPanaxId(v.id || "") || extractPanaxId(v.gameId || "") || extractPanaxId(v.links && v.links.panax || "");
  }
  const s = String(v).trim();
  const mDetail = /panaxgames\.com\/game-detail\/(\d+)/i.exec(s);
  if (mDetail) return mDetail[1];
  const mPref = /^panax_(\d+)$/i.exec(s);
  if (mPref) return mPref[1];
  if (/^\d+$/.test(s)) return s;
  return "";
}

async function panaxSearch(q) {
  const url = `https://panaxgames.com/search/autocomplete?q=${encodeURIComponent(q)}&platform_integration=true`;
  const headers = { "x-anonymous-user-token": PANAX_ANON_TOKEN };
  let r = await fetch(url, { headers, credentials: "include", cache: "no-store" });
  if (r.status === 401 || r.status === 403) {
    r = await fetch(url, { headers, credentials: "omit", cache: "no-store" });
  }
  if (!r.ok) throw new Error("HTTP " + r.status);
  return adaptPanaxSearch(await r.json());
}

async function panaxDetails(idOrTag) {
  const numericId = extractPanaxId(idOrTag);
  const slug = numericId || String(idOrTag || "").trim().replace(/^\/+|\/+$/g, "");
  if (!slug) return null;
  if (panaxDetCache.has(slug)) return panaxDetCache.get(slug);
  const task = (async () => {
    const url = `https://panaxgames.com/game-detail/${encodeURIComponent(slug)}`;
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!r.ok) return null;
    const html = await r.text();
    const gd = extractFlightGameDetails(html);
    let cover = panaxCoverUrl(gd && (gd.cover_image_url || gd.cover_image) || "");
    if (!cover) {
      const mCov = /cover_image_url\\*":\s*\\*"([^\\"]+)/.exec(html);
      if (mCov) cover = panaxCoverUrl(mCov[1]);
    }
    if (!cover) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const coverEl = doc.querySelector('img[alt="Game Cover"]');
      cover = coverEl ? panaxCoverUrl(coverEl.getAttribute("src") || "") : "";
    }
    const dev = gd && Array.isArray(gd.developer_companies)
      ? gd.developer_companies.map((x) => plain(x && x.name || "", 80)).filter(Boolean).join(", ")
      : "";
    const pub = gd && Array.isArray(gd.publisher_companies)
      ? gd.publisher_companies.map((x) => plain(x && x.name || "", 80)).filter(Boolean).join(", ")
      : "";
    const year = String((gd && (gd.release_date || (gd.games && gd.games[0] && gd.games[0].release_year))) || "").slice(0, 4);
    const genres = gd && Array.isArray(gd.genres)
      ? gd.genres.slice(0, 6).map((x) => plain(typeof x === "string" ? x : x && x.name || "", 40)).filter(Boolean)
      : [];
    const ratingScore = gd && gd.rating_score ? String(gd.rating_score) : "";

    const counts = {};
    let total = 0;
    let hasCounts = false;
    for (const [k, field] of PANAX_REACTION_CNT_KEYS) {
      let c = gd && Number.isFinite(Number(gd[field])) ? Number(gd[field]) : NaN;
      if (!Number.isFinite(c)) {
        const m = new RegExp(field + '\\\\*":\\s*(\\d+)').exec(html);
        if (m) c = parseInt(m[1], 10);
      }
      if (Number.isFinite(c)) {
        counts[k] = Math.max(0, c);
        total += counts[k];
        hasCounts = true;
      } else {
        counts[k] = 0;
      }
    }
    const gdTotal = gd && Number(gd.rating_total_cnt) > 0 ? Number(gd.rating_total_cnt) : 0;
    if (!total && gdTotal > 0) total = gdTotal;

    let panaxReactions = null;
    if (total > 0) {
      panaxReactions = {};
      for (const [k] of PANAX_REACTION_CNT_KEYS) {
        panaxReactions[k] = Math.round((counts[k] / total) * 1000) / 10;
      }
    } else if (hasCounts) {
      panaxReactions = { legendary: 0, awesome: 0, good: 0, decent: 0, dislike: 0, awful: 0 };
    } else {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const text = (doc.body && doc.body.textContent) || "";
      const keys = [
        ["legendary", /(?:(?:Legendary|Легенда)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Legendary|Легенда))/i],
        ["awesome", /(?:(?:Awesome|Круто)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Awesome|Круто))/i],
        ["good", /(?:(?:Good|Хорошо)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Good|Хорошо))/i],
        ["decent", /(?:(?:Decent|Норм)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Decent|Норм))/i],
        ["dislike", /(?:(?:Dislike|Плохо)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Dislike|Плохо))/i],
        ["awful", /(?:(?:Awful|Ужас)[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[\s\S]{0,40}?(?:Awful|Ужас))/i]
      ];
      const fallback = {};
      let anyPct = false;
      for (const [k, re] of keys) {
        const m = text.match(re);
        const num = m && (m[1] || m[2]);
        if (num) {
          fallback[k] = parseFloat(num);
          anyPct = true;
        } else {
          fallback[k] = 0;
        }
      }
      if (anyPct) panaxReactions = fallback;
    }

    return {
      panaxId: numericId || (gd && gd.games && gd.games[0] && String(gd.games[0].id || "")) || slug,
      title: plain(gd && gd.name || "", 140),
      cover,
      dev,
      pub,
      year,
      genres,
      ratingScore,
      ratingTotal: total,
      panaxReactions
    };
  })().catch(() => null);
  panaxDetCache.set(slug, task);
  const res = await task;
  if (!res) panaxDetCache.delete(slug);
  return res;
}

async function panaxResolveGame(gOrData) {
  if (!gOrData) return null;
  let panaxId = extractPanaxId(gOrData);
  const rawTitle = String(gOrData.title || "").trim();
  const rawYear = String(gOrData.year || "").slice(0, 4);
  if (!panaxId && rawTitle) {
    const cacheKey = normTitleKey(rawTitle) + "|" + rawYear;
    if (panaxSearchCache.has(cacheKey)) {
      panaxId = await panaxSearchCache.get(cacheKey);
    } else {
      const p = (async () => {
        const cleanQ = rawTitle.replace(/[™®©]+/g, "").trim();
        const items = await panaxSearch(cleanQ);
        if (!items.length) return "";
        const target = normTitleKey(cleanQ);
        let best = null;
        let bestScore = -1;
        for (const it of items) {
          const k = normTitleKey(it.title);
          let sc = 0;
          if (k === target) sc += 100;
          else if (k.startsWith(target) || target.startsWith(k)) sc += 50;
          else if (k.includes(target) || target.includes(k)) sc += 20;
          if (rawYear && it.year) {
            const diff = Math.abs(parseInt(rawYear, 10) - parseInt(it.year, 10));
            if (diff === 0) sc += 30;
            else if (diff <= 1) sc += 15;
          }
          if (sc > bestScore) { bestScore = sc; best = it; }
        }
        return best && bestScore >= 20 ? String(best.panaxId || "") : String(items[0].panaxId || "");
      })().catch(() => "");
      panaxSearchCache.set(cacheKey, p);
      panaxId = await p;
      if (!panaxId) panaxSearchCache.delete(cacheKey);
    }
  }
  if (!panaxId) return null;
  const det = await panaxDetails(panaxId);
  const outId = (det && det.panaxId) || panaxId;
  return {
    ...(det || {}),
    panaxId: outId,
    panaxUrl: `https://panaxgames.com/game-detail/${outId}`
  };
}
async function steamSearch(q, cc = "KZ") {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=${encodeURIComponent(cc)}`;
  return adaptSteamSearch(await getJson(url));
}
async function steamDetails(app, cc = "KZ") {
  app = String(app).replace(/\D/g, "");
  if (!app) return null;
  const url = `https://store.steampowered.com/api/appdetails?appids=${app}&cc=${encodeURIComponent(cc)}&l=russian`;
  return adaptSteamDetails(await getJson(url), app);
}
async function fetchHtmlText(url) {
  try {
    const r = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (r.ok) return { status: r.status, url: r.url || url, html: await r.text() };
    const err = new Error("HTTP " + r.status);
    err.status = r.status;
    throw err;
  } catch (e) {
    if (e && e.status) throw e;
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "panax_xhr", details: { url, method: "GET" } }, (resp) => resolve(resp));
      });
      if (res && res.success && res.status >= 200 && res.status < 400 && typeof res.responseText === "string") {
        return { status: res.status, url, html: res.responseText };
      }
      const err2 = new Error((res && (res.error || ("HTTP " + res.status))) || "Network error");
      if (res && res.status) err2.status = res.status;
      throw err2;
    }
    throw e;
  }
}
async function fetchYoutubeOembed(url) {
  try {
    const data = await getJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (data && typeof data === "object") {
      return { title: str(data.title, 200), channel: str(data.author_name, 80) };
    }
  } catch {
  }
  return null;
}
async function fetchWorkshopMeta(url) {
  try {
    const { html } = await fetchHtmlText(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const title = str(doc.querySelector(".workshopItemTitle")?.textContent?.trim() || "", 200);
    const cover = safeImageUrl(doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "");
    const game = str(doc.querySelector(".apphub_AppName")?.textContent?.trim() || "", 120);
    let author = "";
    const creator = doc.querySelector(".creatorsBlock .friendBlockContent");
    if (creator) {
      const clone = creator.cloneNode(true);
      clone.querySelectorAll(".friendSmallText").forEach((x) => x.remove());
      author = str(clone.textContent.replace(/\s+/g, " ").trim(), 80);
    }
    return { title, cover, game, author };
  } catch {
  }
  return null;
}
async function enrichImportedReview(parsed, opts = {}) {
  const blocks = Array.isArray(parsed.blocks) ? parsed.blocks.slice() : [];
  const tasks = [];

  if (opts.addGameCard !== false && (parsed.game || parsed.appId) && !blocks.some((b) => b.type === "game")) {
    tasks.push((async () => {
      const card = {
        gameId: "imp_" + Date.now().toString(36),
        variant: "classic",
        title: parsed.game || "",
        year: "",
        dev: "",
        pub: "",
        genres: [],
        plat: [],
        cover: "",
        links: {},
        ratings: {},
        panaxReactions: null,
        source: ""
      };
      let appId = parsed.appId || "";
      if (!appId && parsed.game) {
        try {
          const hits = await steamSearch(parsed.game);
          if (hits && hits[0] && hits[0].id) appId = String(hits[0].id);
        } catch {
        }
      }
      if (appId) {
        try {
          const sd = await steamDetails(appId);
          if (sd) {
            if (!card.title && sd.title) card.title = sd.title;
            mergeDetails(card, sd);
            if (!card.cover) card.cover = steamCover(appId);
            card.links.steam = `https://store.steampowered.com/app/${appId}/`;
            card.source = card.source || "Steam";
          }
        } catch {
        }
      }
      if (card.title) {
        try {
          const px = await panaxResolveGame({ title: card.title, year: card.year });
          if (px) {
            if (px.panaxReactions) card.panaxReactions = px.panaxReactions;
            if (px.cover && !card.cover) card.cover = px.cover;
            if (px.panaxUrl) card.links.panax = px.panaxUrl;
            if (px.ratingScore) card.ratings.panax = px.ratingScore;
            if (px.genres && px.genres.length && !card.genres.length) card.genres = px.genres;
            if (px.plat && px.plat.length && !card.plat.length) card.plat = px.plat;
            if (px.year && !card.year) card.year = px.year;
            if (px.dev && !card.dev) card.dev = px.dev;
            if (px.pub && !card.pub) card.pub = px.pub;
            card.source = "PANAX";
          }
        } catch {
        }
      }
      if (card.title) blocks.unshift({ type: "game", data: card });
    })());
  }

  for (const b of blocks) {
    if (b.type === "steam" && b.data && b.data.app) {
      tasks.push((async () => {
        try {
          const sd = await steamDetails(b.data.app);
          if (sd) Object.assign(b.data, steamWidgetPatch(sd, b.data));
        } catch {
        }
      })());
    } else if (b.type === "youtube" && b.data && b.data.url) {
      tasks.push((async () => {
        const yt = await fetchYoutubeOembed(b.data.url);
        if (yt) {
          if (yt.title) b.data.title = yt.title;
          if (yt.channel) b.data.channel = yt.channel;
        }
      })());
    } else if (b.type === "workshop" && b.data && b.data.url && (!b.data.cover || b.data.title === "Предмет Мастерской Steam")) {
      tasks.push((async () => {
        const ws = await fetchWorkshopMeta(b.data.url);
        if (ws) {
          if (ws.title) b.data.title = ws.title;
          if (ws.cover) b.data.cover = ws.cover;
          if (ws.game) b.data.game = ws.game;
          if (ws.author) b.data.author = ws.author;
        }
      })());
    }
  }

  await Promise.allSettled(tasks);
  parsed.blocks = blocks;
  const review = toEditorReview(parsed, clean);
  return { review, warnings: parsed.warnings || [], sourceKind: parsed.sourceKind, stats: { blocks: review.blocks.length, pros: review.pros.length, cons: review.cons.length, aspects: review.aspects.length, score: review.score } };
}
async function importReviewFromUrl(rawUrl, opts = {}) {
  const candidates = buildImportUrlCandidates(rawUrl);
  if (!candidates.length) throw new Error("Некорректный URL обзора.");
  let fetched = null;
  let lastErr = null;
  for (const cand of candidates) {
    try {
      fetched = await fetchHtmlText(cand);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!fetched) throw lastErr || new Error("Не удалось загрузить страницу обзора.");
  const parsed = parseImportedReview(fetched.html, { ...opts, url: fetched.url || candidates[0], win: window });
  return enrichImportedReview(parsed, opts);
}
async function importReviewFromText(rawText, opts = {}) {
  const text = String(rawText || "").trim();
  if (!text) throw new Error("Вставьте текст, BBCode или HTML обзора.");
  const parsed = parseImportedReview(text, { ...opts, win: window });
  return enrichImportedReview(parsed, opts);
}
if (typeof window !== "undefined" && window.document) {
  window.GQ = {
    parentOrigin,
    post(msg) {
      if (parentOrigin) window.parent.postMessage(msg, parentOrigin);
    },
    onMessage(fn) {
      window.addEventListener("message", (e) => {
        if (!parentOrigin || e.source !== window.parent || e.origin !== parentOrigin) return;
        try {
          if (e.data && e.data.type === "gq:upload-result") onUploadResult(e.data);
          fn(e.data);
        } catch (err) {
          console.error("[GameQuill]", err);
        }
      });
    },
    palette: paletteFor,
    color: (c) => safeColor(c) || "#7c5cff",
    url: safeUrl,
    imageUrl: safeImageUrl,
    userImageUrl: safeUserImageUrl,
    publicImageUrl: toPublicPanaxImageUrl,
    probeImageLoad: (url, opts) => probeImageLoad(url, { Image: window.Image, ...opts }),
    shouldPreserveAnimation,
    isGifBytes,
    inspectImageBytes,
    normalizeExternalGifUrl,
    MAX_GALLERY_ITEMS,
    FLAT_GIF_HINT,
    str,
    hasContent: (r) => !!r && hasContent({ title: r.title || "", score: r.score, blocks: r.blocks || [], pros: r.pros || [], cons: r.cons || [], aspects: r.aspects || [] }),
    sanitizeHtml: clean,
    toEditorReview: (x) => toEditorReview(x, clean),
    cleanInteg,
    exportForPost: (r, s) => exportForPost(r, s, window),
    themeList: () => themeList(),
    defaultTheme: DEFAULT_THEME,
    normalizeTheme,
    async loadTheme() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          const stored = await chrome.storage.local.get({ gqTheme: DEFAULT_THEME });
          return normalizeTheme(stored && stored.gqTheme);
        }
      } catch {
      }
      try {
        return normalizeTheme(localStorage.getItem("gqTheme"));
      } catch {
      }
      return DEFAULT_THEME;
    },
    setTheme(id) {
      const t = normalizeTheme(id);
      try {
        localStorage.setItem("gqTheme", t);
      } catch {
      }
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) chrome.storage.local.set({ gqTheme: t });
      } catch {
      }
      return t;
    },
    makeDemoReview,
    applyDemoReview,
    DEMO_CONFIRM,
    DEMO_GAME,
    compressImage: (src, opts) => compressImage(src, { ...opts, document: window.document, Image: window.Image }),
    uploadImage,
    bytesToBase64,
    base64ToBytes,
    isRasterImageType,
    MAX_DATA_IMAGE,
    MAX_UPLOAD_BYTES,
    panaxSearch,
    panaxDetails,
    panaxResolveGame,
    panaxCoverUrl,
    extraCardVariants: () => EXTRA_VARIANTS,
    renderExtraGameCard,
    isPanaxCardVariant,
    steamSearch,
    steamDetails,
    steamWidgetPatch,
    mergeDetails,
    steamCover,
    ytCover,
    importReviewFromUrl,
    importReviewFromText
  };
}
