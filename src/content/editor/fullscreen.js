/**
 * Fullscreen GameQuill Modal Overlay using Shadow DOM.
 * Completely bypasses Chrome MV3 inline script CSP restrictions so every button,
 * ribbon tab, star rating, aspect, and pros/cons block works 100% natively!
 */
import { GAMEQUILL_CSS, GAMEQUILL_HTML, mountGameQuillApp } from './gamequill-app.js';
import { enhanceWidgetsIn } from './viewer.js';

let hostEl = null;
let activeTargetEditable = null;

export function openGameQuillFullscreen(targetEditable) {
  activeTargetEditable = targetEditable;

  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = 'panax-gamequill-shadow-host';
    hostEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #080a11;
      display: block;
    `;

    const shadow = hostEl.attachShadow({ mode: 'open' });

    // Load Google Fonts + GameQuill CSS
    const fontLinks = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter/index.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/unbounded/index.css">
      <style>${GAMEQUILL_CSS}</style>
    `;

    shadow.innerHTML = fontLinks + GAMEQUILL_HTML;
    document.body.appendChild(hostEl);

    mountGameQuillApp(shadow, {
      onApply: (data) => {
        applyGameQuillContent(data);
        closeGameQuillFullscreen();
      },
      onClose: () => {
        closeGameQuillFullscreen();
      },
    });
  }

  hostEl.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

export function closeGameQuillFullscreen() {
  if (hostEl) {
    hostEl.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function applyGameQuillContent(data) {
  if (!activeTargetEditable) return;

  activeTargetEditable.focus();

  const quillRoot = activeTargetEditable.closest('.ql-container')?.__quill;
  if (quillRoot) {
    try {
      quillRoot.clipboard.dangerouslyPasteHTML(data.html || data.markdown || '');
    } catch {
      activeTargetEditable.innerHTML = data.html || '';
    }
  } else {
    activeTargetEditable.innerHTML = data.html || '';
  }

  enhanceWidgetsIn(activeTargetEditable);

  // Trigger input events so React / Panax form state catches the update
  activeTargetEditable.dispatchEvent(new Event('input', { bubbles: true }));
  activeTargetEditable.dispatchEvent(new Event('change', { bubbles: true }));

  if (data.title) {
    const titleInput = document.querySelector('input[placeholder*="Заголовок"], input[placeholder*="Title"]');
    if (titleInput) {
      titleInput.value = data.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
