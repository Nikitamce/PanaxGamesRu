import { MAX_DATA_IMAGE, MAX_UPLOAD_BYTES, toPublicPanaxImageUrl, safeUserImageUrl, base64ToBytes, isRasterImageType, isGifBytes, shouldPreserveAnimation, MAX_GALLERY_ITEMS, inspectImageBytes, FLAT_GIF_HINT, bytesToBase64, normalizeExternalGifUrl, probeImageLoad, compressImage } from "../shared/gq-image.js";
import { str, safeUrl, safeImageUrl, safeColor, normalizeReview, hasContent } from "../shared/gq-schema.js";
import { DEMO_CONFIRM, DEMO_GAME, makeDemoReview, applyDemoReview } from "../shared/gq-demo.js";
import { sanitizeHtml } from "../shared/gq-html.js";
import { FOOTER_TEXT, buildFallback, attachCarriers, opsToHtml } from "../shared/gq-fallback.js";
import { VS_MAX_CHARS, encodeDoc, vsEncode } from "../shared/gq-payload.js";
import { paletteFor } from "../shared/gq-cover.js";
import { DEFAULT_THEME, normalizeTheme, themeList } from "../shared/gq-theme.js";
import { plain, toEditorReview, cleanInteg, buildIntegMap, steamCover, ytCover, adaptSteamSearch, adaptSteamDetails, steamWidgetPatch, mergeDetails } from "./bridge-core.js";

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
async function exportForPost(review, settings, win = window) {
  const s = settings || {};
  const author = s.author && s.author !== "\u0412\u0430\u0448\u0435 \u0438\u043C\u044F" ? s.author : "";
  const integ = buildIntegMap(review, s.integrations);
  const doc = normalizeReview({ ...review, author, integ, updatedAt: Date.now() }, { sanitizeHtml: (h) => sanitizeHtml(h, win) });
  if (!doc || !hasContent(doc)) throw Object.assign(new Error("\u041E\u0431\u0437\u043E\u0440 \u043F\u0443\u0441\u0442\u043E\u0439"), { code: "empty" });
  const fb0 = buildFallback(doc, { win });
  doc.fp = fb0.fp;
  let enc2;
  try {
    enc2 = await encodeDoc(doc);
  } catch (e) {
    if (!(e && e.code === "too-large")) throw e;
    const stripped = stripLocalImageBlocks(doc);
    if (!stripped) throw e;
    const fb1 = buildFallback(doc, { win });
    doc.fp = fb1.fp;
    enc2 = await encodeDoc(doc);
  }
  const fb = buildFallback(doc, { win });
  const vs = enc2.bytes.length <= VS_MAX_CHARS ? vsEncode(enc2.bytes) : "";
  const ops = attachCarriers(fb.ops, { text: enc2.text, vs });
  let plain2 = fb.plain;
  if (vs) {
    const i = plain2.lastIndexOf(FOOTER_TEXT);
    plain2 = i >= 0 ? plain2.slice(0, i + FOOTER_TEXT.length) + vs + plain2.slice(i + FOOTER_TEXT.length) : plain2 + vs;
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
    steamSearch,
    steamDetails,
    steamWidgetPatch,
    mergeDetails,
    steamCover,
    ytCover
  };
}
