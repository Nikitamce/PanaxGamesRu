/**
 * Fullscreen GameQuill Modal Overlay that embeds gamequill.html
 * in an iframe and seamlessly exchanges content with Panax.
 */

let overlayEl = null;
let activeTargetEditable = null;

export function openGameQuillFullscreen(targetEditable) {
  activeTargetEditable = targetEditable;

  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'panax-gamequill-overlay';
    overlayEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #080a11;
      display: flex;
      flex-direction: column;
      animation: panaxFadeIn 0.2s ease;
    `;

    const iframeUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('gamequill.html')
      : '/gamequill.html';

    overlayEl.innerHTML = `
      <div style="height:3px;background:linear-gradient(90deg,#7c5cff,#22d3ee);"></div>
      <iframe id="panax-gamequill-frame" src="${iframeUrl}" style="flex:1;border:none;width:100%;height:100%;background:#080a11;"></iframe>
    `;

    document.body.appendChild(overlayEl);

    // Listen to messages from GameQuill iframe
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'PANAX_GAMEQUILL_CLOSE') {
        closeGameQuillFullscreen();
        return;
      }

      if (event.data.type === 'PANAX_GAMEQUILL_APPLY') {
        applyGameQuillContent(event.data);
        closeGameQuillFullscreen();
      }
    });
  }

  overlayEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeGameQuillFullscreen() {
  if (overlayEl) {
    overlayEl.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function applyGameQuillContent(data) {
  if (!activeTargetEditable) return;

  activeTargetEditable.focus();

  // If Panax uses Quill, update its contents or innerHTML
  const quillRoot = activeTargetEditable.closest('.ql-container')?.__quill;
  if (quillRoot) {
    try {
      quillRoot.clipboard.dangerouslyPasteHTML(data.html || data.markdown || '');
    } catch {
      activeTargetEditable.innerHTML = data.html || '';
    }
  } else {
    // Standard contenteditable
    activeTargetEditable.innerHTML = data.html || '';
  }

  // Trigger input events so React / form state catches the update
  activeTargetEditable.dispatchEvent(new Event('input', { bubbles: true }));
  activeTargetEditable.dispatchEvent(new Event('change', { bubbles: true }));

  // Also check if there's a title input in the page and fill it
  if (data.title) {
    const titleInput = document.querySelector('input[placeholder*="Заголовок"], input[placeholder*="Title"]');
    if (titleInput) {
      titleInput.value = data.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
