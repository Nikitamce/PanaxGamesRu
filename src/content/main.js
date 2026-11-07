import dict from '../locales/ru.json';
import { createEngine } from './engine.js';
import { startObserver } from './observer.js';
import { injectStyles } from './styles.js';
import { shouldSkipRoot } from './skip.js';
import { startMessagesPatch } from './messages-patch.js';
import { startWritePatch } from './write-patch.js';
import { startRatingIcons } from './rating-icons.js';
import { startLogo } from './logo.js';

/**
 * Optional harvest: open the site with #panax-ru-harvest
 * and call copy(window.__PANAX_RU_HARVEST__) in DevTools.
 */
function startHarvest(engine) {
  if (!/#panax-ru-harvest\b/.test(location.hash)) return;
  const seen = new Set();
  const missing = [];

  const scan = (root) => {
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {
        const parent = node.parentElement;
        if (!parent || shouldSkipRoot(parent) || parent.isContentEditable) return;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(parent.tagName)) {
          return;
        }
        const text = String(node.nodeValue || '')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text || text.length > 120 || text.length < 2) return;
        if (!/^[A-Za-z]/.test(text)) return;
        if (seen.has(text)) return;
        seen.add(text);
        if (engine.translateText(text) == null) missing.push(text);
        return;
      }
      if (node.nodeType !== 1) return;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(node.tagName)) {
        return;
      }
      if (shouldSkipRoot(node)) return;
      if (node.shadowRoot) walk(node.shadowRoot);
      for (const child of node.childNodes) walk(child);
    };
    walk(root);
  };

  const refresh = () => {
    scan(document.body || document.documentElement);
    globalThis.__PANAX_RU_HARVEST__ = missing.slice().sort((a, b) => a.localeCompare(b));
    console.info(`[PANAX RU harvest] ${missing.length} missing → window.__PANAX_RU_HARVEST__`);
  };

  setTimeout(refresh, 1500);
  setInterval(refresh, 4000);
}

function boot() {
  injectStyles();

  // Do not set <html lang="ru"> — next-intl may chase a missing ru catalog.

  const engine = createEngine(dict);
  const { schedule } = startObserver(engine);
  startHarvest(engine);

  // Visible proof the build is alive (hide with #panax-ru-hide-badge)
  if (!document.getElementById('panax-ru-badge') && !/#panax-ru-hide-badge\b/.test(location.hash)) {
    const badge = document.createElement('div');
    badge.id = 'panax-ru-badge';
    badge.textContent = 'PANAX RU 0.2.64';
    (document.body || document.documentElement).appendChild(badge);
  }

  // Intercept React text writes for hardcoded chrome (MAIN world)
  try {
    startWritePatch(dict);
  } catch {
    /* ignore */
  }

  // Keep fighting React re-hydration that restores English
  let n = 0;
  const tick = () => {
    engine.run(document.body || document.documentElement);
    n += 1;
    setTimeout(tick, n < 120 ? 150 : n < 240 ? 600 : 3000);
  };
  setTimeout(tick, 30);

  globalThis.__PANAX_RU_ENGINE__ = engine;
  globalThis.__PANAX_RU_SCHEDULE__ = schedule;

  try {
    startMessagesPatch(dict);
  } catch {
    /* ignore */
  }

  try {
    startRatingIcons();
    startLogo();
  } catch {
    /* ignore */
  }

  console.info(`[PANAX RU] v0.2.64 · ${Object.keys(dict).length} strings · active`);
}

if (!globalThis.__PANAX_RU__) {
  globalThis.__PANAX_RU__ = true;
  if (document.documentElement) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
} else if (globalThis.__PANAX_RU_SCHEDULE__) {
  globalThis.__PANAX_RU_SCHEDULE__();
}
