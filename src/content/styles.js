/** Expand status / feed pills so Russian fits — keep header/nav/tab bar width intact. */
const CSS = `
/* Status follow pills (Played / Playing / …) — not header CTAs */
html.panax-ru .game-follow-round-button,
html.panax-ru button.game-follow-round-button,
html.panax-ru [data-panax-ru="pill"].game-follow-round-button {
  min-width: fit-content !important;
  width: max-content !important;
  max-width: none !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  padding-left: 0.9rem !important;
  padding-right: 0.9rem !important;
}

/* Russian follow-back and other long CTAs: grow the pill, not the header */
html.panax-ru button[data-panax-ru="wide"],
html.panax-ru a[data-panax-ru="wide"],
html.panax-ru [role="button"][data-panax-ru="wide"] {
  min-width: max-content !important;
  width: max-content !important;
  max-width: none !important;
  flex-shrink: 0 !important;
  overflow: visible !important;
  white-space: nowrap !important;
  text-overflow: clip !important;
  padding-left: 1.35rem !important;
  padding-right: 1.35rem !important;
  box-sizing: border-box !important;
}

html.panax-ru .edit-btn {
  width: max-content !important;
  min-width: max-content !important;
  overflow: visible !important;
}
html.panax-ru .edit-label {
  white-space: nowrap !important;
  overflow: visible !important;
}

html.panax-ru .game-follow-round-button .label,
html.panax-ru .game-follow-round-button span.label,
html.panax-ru [data-panax-ru="label"] {
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
}

/*
 * Feed tab BUTTONS only — never .tab-button-container (that selector
 * used to match [class*="tab-button"] and blew the sticky bar wider
 * than the feed column).
 */
html.panax-ru button.tab-button,
html.panax-ru .tab-button:is(button, a, [role="tab"]) {
  min-width: fit-content !important;
  width: auto !important;
  max-width: none !important;
  overflow: visible !important;
  overflow-clip-margin: unset !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

html.panax-ru .tab-button-label,
html.panax-ru p.tab-button-label {
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
}

/* Tab row stays inside the column. Russian labels scroll sideways. */
html.panax-ru .tab-button-container,
html.panax-ru [class*="tab-button-container"] {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) transparent;
}
html.panax-ru .tab-button-container::-webkit-scrollbar,
html.panax-ru [class*="tab-button-container"]::-webkit-scrollbar {
  height: 4px;
}
html.panax-ru .tab-button-container::-webkit-scrollbar-thumb,
html.panax-ru [class*="tab-button-container"]::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 999px;
}

/* The row that actually scrolls hides its bar and fades the last tab. */
html.panax-ru .tab-navigation-container {
  scrollbar-width: thin !important;
  scrollbar-color: rgba(255, 255, 255, 0.5) transparent !important;
  padding-bottom: 6px !important;
}
html.panax-ru .tab-navigation-container::-webkit-scrollbar {
  display: block !important;
  height: 5px !important;
  width: auto !important;
}
html.panax-ru .tab-navigation-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.5) !important;
  border-radius: 999px !important;
}
html.panax-ru .tab-button-container .gradient-overlay {
  display: none !important;
}

/* Card / detail CTAs: grow a little, never force header flex to explode */
html.panax-ru main button[class*="rounded-full"],
html.panax-ru main a[class*="rounded-full"],
html.panax-ru [class*="game-card"] button[class*="rounded-full"],
html.panax-ru [class*="game-card"] a[class*="rounded-full"],
html.panax-ru [class*="GameCard"] button,
html.panax-ru article button[class*="rounded-full"],
html.panax-ru article a[class*="rounded-full"] {
  min-width: fit-content !important;
  width: auto !important;
  max-width: none !important;
  white-space: nowrap !important;
  padding-left: 0.85rem !important;
  padding-right: 0.85rem !important;
}

/* Header / sticky top: allow shrink, no max-content blowout */
html.panax-ru header button[class*="rounded-full"],
html.panax-ru header a[class*="rounded-full"],
html.panax-ru nav button[class*="rounded-full"],
html.panax-ru nav a[class*="rounded-full"],
html.panax-ru [class*="sticky"] > button[class*="rounded-full"],
html.panax-ru [class*="sticky"] a[class*="rounded-full"],
html.panax-ru [class*="navbar"] button[class*="rounded-full"],
html.panax-ru [class*="Navbar"] button[class*="rounded-full"] {
  min-width: 0 !important;
  width: auto !important;
  max-width: 100% !important;
  flex-shrink: 1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
}

/* Clothing editor: never flash the English label. Revealed in the same
   frame the MAIN-world patch writes the Russian word. */
html.panax-ru :is(.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]):not([data-panax-ru-on]),
html.panax-ru :is(.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]):not([data-panax-ru-on]) * {
  color: transparent !important;
}

#panax-ru-badge {
  position: fixed;
  z-index: 2147483646;
  right: 8px;
  bottom: 8px;
  background: #7c3aed;
  color: #fff;
  font: 700 12px/1.2 system-ui, sans-serif;
  padding: 8px 12px;
  border-radius: 999px;
  opacity: 0.95;
  pointer-events: none;
  box-shadow: 0 2px 12px rgba(124,58,237,.55);
  letter-spacing: 0.02em;
}
`;

export function injectStyles() {
  if (document.getElementById('panax-ru-css')) return;
  const style = document.createElement('style');
  style.id = 'panax-ru-css';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('panax-ru');
}
