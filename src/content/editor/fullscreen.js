/**
 * Fullscreen GameQuill Modal Overlay using Shadow DOM.
 * Completely bypasses Chrome MV3 inline script CSP restrictions and inserts
 * the complete review HTML into Panax Quill / ContentEditable cleanly.
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

    const fontLinks = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter/index.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/unbounded/index.css">
      <style>${GAMEQUILL_CSS}</style>
    `;

    shadow.innerHTML = fontLinks + GAMEQUILL_HTML;
    document.body.appendChild(hostEl);

    mountGameQuillApp(shadow, {
      onApply: (data) => {
        closeGameQuillFullscreen();
        setTimeout(() => {
          applyGameQuillContent(data);
        }, 40);
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

function pasteHtmlIntoEditable(el, html, fallbackText) {
  el.focus();

  // Select all existing content inside the editable so we replace or append cleanly
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);

  // 1. Try synthetic ClipboardEvent('paste') with text/html & text/plain
  // Both Quill and React Draft/Lexical/ContentEditable listen to 'paste' on the editor element
  try {
    const dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', fallbackText || '');
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    const notCancelled = el.dispatchEvent(pasteEvent);

    // If the editor handled paste and prevented default, check if content updated
    if (!notCancelled && el.textContent.trim().length > 10) {
      return;
    }
  } catch {
    /* fallback below */
  }

  // 2. Fallback to execCommand('insertHTML')
  try {
    if (document.execCommand('insertHTML', false, html)) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  } catch {
    /* fallback below */
  }

  // 3. Direct innerHTML assignment + input event
  el.innerHTML = html;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyGameQuillContent(data) {
  // Re-locate editable if needed
  const target = activeTargetEditable && activeTargetEditable.isConnected
    ? activeTargetEditable
    : document.querySelector('.ql-editor, [contenteditable="true"]');

  if (!target) return;

  pasteHtmlIntoEditable(target, data.html || '', data.markdown || '');
  enhanceWidgetsIn(target);
  enhanceWidgetsIn(document);

  if (data.title) {
    const titleInput = document.querySelector('input[placeholder*="Заголовок"], input[placeholder*="Title"]');
    if (titleInput) {
      titleInput.value = data.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
