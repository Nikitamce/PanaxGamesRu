import { injectFonts, loadDoc } from "./viewer.js";
import render_default from "./render.css";
import { renderReview } from "./render.js";
import { DEFAULT_THEME, normalizeTheme } from "../../shared/gq-theme.js";
import { hasSignedQuery, toPublicPanaxImageUrl, safeUserImageUrl } from "../../shared/gq-image.js";
import { getSettings } from "../settings.js";
import { GQError, fromB64url, decodeCarrier } from "../../shared/gq-payload.js";
import { armed } from "./main-bridge.js";
import { normalizeReview, countGalleryFrames } from "../../shared/gq-schema.js";
import { sanitizeHtml } from "../../shared/gq-html.js";
import { carrierKeyFromText, isComposerPage, looksLikePayloadText } from "./detect.js";

var SS_KEY2 = "gq:carriers";
var SS_DRAFT = "gq:composer-draft";
var host = null;
var ui = null;
var frameReady = false;
var lastDoc = null;
var preview = null;
var EXT_ORIGIN = () => {
  try {
    return "chrome-extension://" + chrome.runtime.id;
  } catch {
    return "";
  }
};
var editParams = () => {
  const q = new URLSearchParams(location.search);
  const mode = q.get("mode") === "edit" ? "edit" : "new";
  const id = (q.get("id") || "").replace(/\D/g, "").slice(0, 20) || null;
  return { mode, id };
};
var CSS2 = `
:host{all:initial}
.btn{position:fixed;right:22px;bottom:22px;z-index:2147482000;display:flex;align-items:center;gap:8px;
font:600 14px/1 system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;cursor:pointer;border:none;
padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,#7c5cff,#a26bff);
box-shadow:0 10px 30px rgba(124,92,255,.45)}
.btn:hover{filter:brightness(1.08)}
.btn small{font-weight:500;opacity:.8;font-size:11px}
.ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,6,12,.72);display:none}
.ov.on{display:block}
.ov iframe{position:absolute;inset:12px;width:calc(100% - 24px);height:calc(100% - 24px);border:0;border-radius:14px;
background:#080a11;box-shadow:0 30px 90px rgba(0,0,0,.6)}
.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483001;max-width:520px;
font:500 13px/1.45 system-ui,sans-serif;color:#fff;background:#1c2231;border:1px solid #2d3648;
padding:10px 16px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.toast.err{border-color:#ff5f6d}
`;
function toast(msg, err) {
  if (!ui) return;
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  ui.root.appendChild(t);
  setTimeout(() => t.remove(), 5200);
}
function ensureUi() {
  if (host && host.isConnected) return;
  host = document.createElement("gq-composer");
  host.setAttribute("data-panax-ru-skip", "");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = CSS2;
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.title = "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043F\u043E\u0441\u0442 \u0438\u043B\u0438 \u043E\u0431\u0437\u043E\u0440 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435 GameQuill";
  btn.append("\u2728 GameQuill");
  const ov = document.createElement("div");
  ov.className = "ov";
  root.append(style, btn, ov);
  btn.addEventListener("click", openEditor);
  ov.addEventListener("click", (e) => {
    if (e.target === ov) closeEditor();
  });
  document.documentElement.appendChild(host);
  ui = { root, btn, overlay: ov, frame: null };
  frameReady = false;
}
function removeUi() {
  if (host) host.remove();
  host = null;
  ui = null;
  frameReady = false;
}
function openEditor() {
  ensureUi();
  if (!ui.frame) {
    const f = document.createElement("iframe");
    f.src = chrome.runtime.getURL("gamequill/index.html");
    f.setAttribute("allow", "clipboard-write");
    f.title = "GameQuill";
    ui.overlay.appendChild(f);
    ui.frame = f;
  } else if (frameReady) {
    sendInit();
  }
  ui.overlay.classList.add("on");
  ui.btn.style.display = "none";
  document.documentElement.style.overflow = "hidden";
}
function closeEditor() {
  if (!ui) return;
  ui.overlay.classList.remove("on");
  ui.btn.style.display = "";
  document.documentElement.style.overflow = "";
}
function post(msg) {
  if (ui && ui.frame && ui.frame.contentWindow) ui.frame.contentWindow.postMessage(msg, EXT_ORIGIN());
}
function carrierFromStore(id) {
  try {
    const m = JSON.parse(sessionStorage.getItem(SS_KEY2) || "{}");
    return m && m[id] || "";
  } catch {
    return "";
  }
}
async function decodeCarrierString(s) {
  if (!s) throw new GQError("not-gq");
  if (s.startsWith("vs:")) return decodeCarrier({ kind: "vs", bytes: fromB64url(s.slice(3)) });
  return decodeCarrier(s);
}
async function docFromCarrier(s) {
  if (!s) return null;
  try {
    const raw = await decodeCarrierString(s);
    return normalizeReview(raw, { sanitizeHtml: (h2) => sanitizeHtml(h2) });
  } catch {
    return null;
  }
}
async function findExistingDoc(id) {
  const tries = [];
  if (id) {
    const c = carrierFromStore(id);
    if (c) tries.push(c);
  }
  try {
    const draft = sessionStorage.getItem(SS_DRAFT) || "";
    if (draft) tries.push(draft);
  } catch {
  }
  const ed = document.querySelector(".ql-editor");
  const fromText = ed ? carrierKeyFromText(ed.textContent || "") : "";
  if (fromText) tries.push(fromText);
  const seen2 = /* @__PURE__ */ new Set();
  for (const c of tries) {
    if (!c || seen2.has(c)) continue;
    seen2.add(c);
    const doc = await docFromCarrier(c);
    if (doc) return doc;
  }
  return lastDoc;
}
function editorPlainText() {
  const ed = document.querySelector(".ql-editor");
  if (!ed) return "";
  const lines = [];
  for (const p of ed.children) lines.push((p.textContent || "").replace(/[\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]/g, ""));
  return lines.join("\n").trim();
}
var escHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
async function sendInit() {
  const { mode, id } = editParams();
  const s = getSettings();
  post({ type: "gq:init", steamCountry: s.steamCountry || "KZ", postId: id, mode });
  const doc = lastDoc || await findExistingDoc(id);
  if (doc) {
    post({ type: "gq:load", doc });
    return;
  }
  if (mode !== "edit") return;
  const text = editorPlainText();
  if (text) {
    const html = text.split("\n").map((l) => escHtml(l)).join("<br>");
    post({ type: "gq:load", soft: true, doc: { title: "", blocks: [{ type: "text", html }] } });
  }
}
function editorShell() {
  const container = document.querySelector(".ql-container");
  const toolbar = document.querySelector(".ql-toolbar");
  return { container, toolbar, editor: document.querySelector(".ql-editor") };
}
function setEditorHidden(on) {
  const { container, toolbar } = editorShell();
  const op = on ? "setAttribute" : "removeAttribute";
  if (container) container[op]("data-gq-composer-hidden", "");
  if (toolbar) toolbar[op]("data-gq-composer-hidden", "");
}
function hidePreview() {
  if (preview && preview.host) preview.host.remove();
  preview = null;
  setEditorHidden(false);
}
function rememberDraft(carrier) {
  if (!carrier) return;
  try {
    sessionStorage.setItem(SS_DRAFT, carrier);
  } catch {
  }
}
function currentTheme() {
  return normalizeTheme((getSettings() || {}).gqTheme || DEFAULT_THEME);
}
function showComposerPreview(doc, { carrier, locked } = {}) {
  if (!doc) return null;
  lastDoc = doc;
  if (carrier) rememberDraft(carrier);
  injectFonts();
  const { container } = editorShell();
  if (!container || !container.parentNode) return null;
  const keepLocked = !!(locked || preview && preview.locked);
  hidePreview();
  const wrap = document.createElement("div");
  wrap.setAttribute("data-gq-preview", "");
  wrap.setAttribute("data-gq-frames", String(countGalleryFrames(doc)));
  wrap.setAttribute("data-gq-theme", currentTheme());
  wrap.setAttribute("data-panax-ru-skip", "");
  const bar = document.createElement("div");
  bar.className = "gq-preview-bar";
  const label = document.createElement("span");
  label.innerHTML = "";
  label.append("\u2728 GameQuill \xB7 ");
  const ro = document.createElement("span");
  ro.className = "gq-ro";
  ro.textContent = "\u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440";
  label.append(ro);
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.setAttribute("data-gq-edit", "");
  editBtn.textContent = "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 GameQuill";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ghost";
  toggle.setAttribute("data-gq-toggle", "");
  toggle.textContent = "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441\u0430\u0439\u0442\u0430";
  bar.append(label, editBtn, toggle);
  const body = document.createElement("div");
  body.setAttribute("data-gq-preview-body", "");
  const root = body.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = render_default;
  const inner = document.createElement("div");
  inner.className = "wrap";
  inner.setAttribute("data-gq-theme", currentTheme());
  inner.append(renderReview(document, doc));
  root.append(style, inner);
  wrap.append(bar, body);
  container.after(wrap);
  let showing = true;
  const apply = () => {
    setEditorHidden(showing);
    wrap.classList.toggle("is-plain", !showing);
    body.style.display = showing ? "" : "none";
    toggle.textContent = showing ? "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441\u0430\u0439\u0442\u0430" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 GameQuill";
  };
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openEditor();
  });
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showing = !showing;
    apply();
  });
  apply();
  preview = { host: wrap, showing: () => showing, locked: keepLocked, fresh: Date.now() };
  return wrap;
}
async function syncPreview() {
  if (!isComposerPage()) {
    hidePreview();
    return;
  }
  const ed = document.querySelector(".ql-editor");
  if (!ed) {
    hidePreview();
    return;
  }
  const txt = ed.textContent || "";
  const key = carrierKeyFromText(txt);
  if (key) {
    if (preview && preview.host.isConnected && lastDoc && preview.key === key) return;
    const doc = await loadDoc(key);
    if (doc) {
      const el = showComposerPreview(doc, { carrier: key });
      if (el) preview.key = key;
      return;
    }
  }
  if (lastDoc && looksLikePayloadText(txt)) {
    if (preview && preview.host.isConnected) return;
    showComposerPreview(lastDoc);
    return;
  }
  if (!looksLikePayloadText(txt)) {
    if (lastDoc && preview && (preview.locked || Date.now() - (preview.fresh || 0) < 6e4)) {
      if (!preview.host || !preview.host.isConnected) showComposerPreview(lastDoc, { locked: true });
      return;
    }
    hidePreview();
    lastDoc = null;
  }
}
function armMain(payload) {
  return new Promise((resolve) => {
    let done = false;
    const onArmed = (e) => {
      done = true;
      document.removeEventListener("gq:armed", onArmed);
      try {
        resolve(JSON.parse(String(e.detail || "{}")));
      } catch {
        resolve({ ok: false });
      }
    };
    document.addEventListener("gq:armed", onArmed);
    document.dispatchEvent(new CustomEvent("gq:arm", { detail: JSON.stringify(payload) }));
    setTimeout(() => {
      if (!done) {
        document.removeEventListener("gq:armed", onArmed);
        resolve({ ok: false, timeout: true });
      }
    }, 2e3);
  });
}
async function onTransfer(m) {
  if (!Array.isArray(m.ops) || typeof m.plain !== "string") return;
  const res = await armMain({ ops: m.ops, plain: m.plain, html: String(m.html || "") });
  const carrier = m.carrier || carrierKeyFromText(m.plain || "") || "";
  const transferred = m.doc && typeof m.doc === "object" ? normalizeReview(m.doc, { sanitizeHtml: (h2) => sanitizeHtml(h2) }) : null;
  const doc = transferred || carrier && await docFromCarrier(carrier) || lastDoc;
  if (res.ok) {
    if (doc) {
      const el = showComposerPreview(doc, { carrier, locked: true });
      if (el && preview) preview.fresh = Date.now();
    }
    post({ type: "gq:transfer-result", ok: true, message: "\u0413\u043E\u0442\u043E\u0432\u043E: \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435 \u0441\u0430\u0439\u0442\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Post / \xAB\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C\xBB \u043D\u0430 \u0441\u0430\u0439\u0442\u0435." });
    closeEditor();
    toast("GameQuill: \u043E\u0431\u0437\u043E\u0440 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0451\u043D. \u0412\u044B \u0432\u0438\u0434\u0438\u0442\u0435 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435; \u0442\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u0435\u0439 \u0431\u0435\u0437 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432 \u043F\u043E\u043B\u0435 \u0441\u0430\u0439\u0442\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Post / \xAB\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C\xBB.");
  } else {
    post({
      type: "gq:transfer-result",
      ok: false,
      message: res.timeout ? "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 (\u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u043E\u0441\u044C \u0432 \u043C\u0438\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B). \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430." : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0441\u0430\u0439\u0442\u0430. \u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435, \u043D\u043E \u0442\u0435\u043A\u0441\u0442 \u0432 \u043F\u043E\u043B\u0435 \u0441\u0430\u0439\u0442\u0430 \u043C\u043E\u0436\u0435\u0442 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C."
    });
  }
}
function onMessage(e) {
  if (!ui || !ui.frame || e.source !== ui.frame.contentWindow) return;
  if (e.origin !== EXT_ORIGIN()) return;
  const m = e.data;
  if (!m || typeof m !== "object") return;
  if (m.type === "gq:ready") {
    frameReady = true;
    sendInit();
  } else if (m.type === "gq:close") {
    closeEditor();
  } else if (m.type === "gq:transfer") {
    onTransfer(m);
  } else if (m.type === "gq:upload-image") {
    onUploadImage(m);
  }
}
function onUploadImage(m) {
  const reqId = m && m.reqId;
  if (!reqId) return;
  let done = false;
  const reply = (res) => {
    if (done) return;
    done = true;
    document.removeEventListener("gq:upload-done", onDone);
    const out = { ...res, reqId };
    if (out.ok && out.url) {
      const href = toPublicPanaxImageUrl(out.url) || safeUserImageUrl(out.url);
      if (!href || hasSignedQuery(href)) {
        post({ type: "gq:upload-result", reqId, ok: false, code: "url", error: "\u043D\u0435\u043B\u044C\u0437\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u0438\u043B\u0438 \u043D\u0435\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441" });
        return;
      }
      out.url = href;
    }
    post({ type: "gq:upload-result", ...out });
  };
  const onDone = (e) => {
    try {
      reply(JSON.parse(e.detail || "{}"));
    } catch {
      reply({ ok: false, code: "parse", error: "\u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" });
    }
  };
  document.addEventListener("gq:upload-done", onDone);
  document.dispatchEvent(new CustomEvent("gq:upload", { detail: JSON.stringify({
    reqId,
    name: m.name || "",
    contentType: m.contentType || "",
    width: m.width || 0,
    height: m.height || 0,
    b64: m.b64 || ""
  }) }));
  setTimeout(() => {
    reply({ ok: false, code: "timeout", error: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 \u043D\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 (\u043C\u0438\u0440 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B). \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443." });
  }, 65e3);
}
var lastHref = "";
function tick() {
  const onComposer = isComposerPage();
  if (location.href === lastHref && (!onComposer || host && host.isConnected)) {
    if (onComposer) syncPreview().catch(() => {
    });
    return;
  }
  const pathChanged = location.href !== lastHref;
  lastHref = location.href;
  if (!onComposer) {
    if (host) removeUi();
    hidePreview();
    return;
  }
  if (pathChanged && host) removeUi();
  if (document.querySelector(".ql-editor")) {
    ensureUi();
    syncPreview().catch(() => {
    });
  } else lastHref = "";
}
export function startComposer() {
  if (globalThis.__GQ_COMPOSER__) return;
  globalThis.__GQ_COMPOSER__ = true;
  window.addEventListener("message", onMessage);
  setInterval(tick, 700);
  tick();
}
