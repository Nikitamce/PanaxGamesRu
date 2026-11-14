import ru_default from "../locales/ru.json";
import { shouldSkipRoot } from "./skip.js";
import { createEngine } from "./engine.js";
import { startObserver } from "./observer.js";
import { injectStyles } from "./styles.js";
import { startMessagesPatch } from "./messages-patch.js";
import { startWritePatch } from "./write-patch.js";
import { startRatingIcons } from "./rating-icons.js";
import { startLogo } from "./logo.js";
import { startEnrichment } from "./enrichment/game-enrichment.js";
import { startPostTranslate } from "./features/post-translate.js";
import { startGameQuill } from "./gamequill/index.js";

function startHarvest(engine) {
  if (!/#panax-ru-harvest\b/.test(location.hash)) return;
  const seen2 = /* @__PURE__ */ new Set();
  const missing = [];
  const scan2 = (root) => {
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {
        const parent = node.parentElement;
        if (!parent || shouldSkipRoot(parent) || parent.isContentEditable) return;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"].includes(parent.tagName)) {
          return;
        }
        const text = String(node.nodeValue || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
        if (!text || text.length > 120 || text.length < 2) return;
        if (!/^[A-Za-z]/.test(text)) return;
        if (seen2.has(text)) return;
        seen2.add(text);
        if (engine.translateText(text) == null) missing.push(text);
        return;
      }
      if (node.nodeType !== 1) return;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"].includes(node.tagName)) {
        return;
      }
      if (shouldSkipRoot(node)) return;
      if (node.shadowRoot) walk(node.shadowRoot);
      for (const child of node.childNodes) walk(child);
    };
    walk(root);
  };
  const refresh = () => {
    scan2(document.body || document.documentElement);
    globalThis.__PANAX_RU_HARVEST__ = missing.slice().sort((a, b) => a.localeCompare(b));
    console.info(`[PANAX RU harvest] ${missing.length} missing \u2192 window.__PANAX_RU_HARVEST__`);
  };
  setTimeout(refresh, 1500);
  setInterval(refresh, 4e3);
}
function boot() {
  injectStyles();
  const engine = createEngine(ru_default);
  const { schedule } = startObserver(engine);
  startHarvest(engine);
  try {
    startWritePatch(ru_default);
  } catch {
  }
  let n = 0;
  const tick2 = () => {
    engine.run(document.body || document.documentElement);
    n += 1;
    setTimeout(tick2, n < 120 ? 150 : n < 240 ? 600 : 3e3);
  };
  setTimeout(tick2, 30);
  globalThis.__PANAX_RU_ENGINE__ = engine;
  globalThis.__PANAX_RU_SCHEDULE__ = schedule;
  try {
    startMessagesPatch(ru_default);
  } catch {
  }
  try {
    startRatingIcons();
    startLogo();
    startEnrichment();
    startPostTranslate();
  } catch {
  }
  startGameQuill().catch((e) => console.warn("[PANAX RU] GameQuill", e));
  console.info(`[PANAX RU] v${true ? "0.3.5" : "0.3.5"} \xB7 ${Object.keys(ru_default).length} strings \xB7 active`);
}
function start() {
  if (globalThis.__PANAX_RU__) {
    if (globalThis.__PANAX_RU_SCHEDULE__) globalThis.__PANAX_RU_SCHEDULE__();
    return;
  }
  globalThis.__PANAX_RU__ = true;
  if (document.documentElement) boot();
  else document.addEventListener("DOMContentLoaded", boot, { once: true });
}
function whenEnabled(on) {
  if (document.documentElement) document.documentElement.dataset.panaxRu = on ? "on" : "off";
  if (on) start();
}
var hasStorage = typeof chrome !== "undefined" && chrome.storage?.local;
if (hasStorage) {
  chrome.storage.local.get({ panaxRuEnabled: true }, (data) => {
    whenEnabled(data.panaxRuEnabled !== false);
  });
} else {
  const started = Date.now();
  const wait = () => {
    const flag = document.documentElement?.dataset.panaxRu;
    if (flag === "on") start();
    else if (flag === "off") return;
    else if (Date.now() - started > 800) start();
    else requestAnimationFrame(wait);
  };
  wait();
}
