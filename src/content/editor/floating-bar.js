/**
 * Floating Selection Bar that appears directly above selected text
 * inside any contenteditable / Quill editor in Panax.
 */
import { openInsertModal } from './modal.js';
import { buildGameChipHtml } from './serializer.js';

let floatBarEl = null;
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  if (!savedRange) return false;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
  return true;
}

function exec(cmd, val = null) {
  restoreSelection();
  document.execCommand('styleWithCSS', false, false);
  document.execCommand(cmd, false, val);
}

function createFloatBar() {
  if (floatBarEl) return floatBarEl;

  floatBarEl = document.createElement('div');
  floatBarEl.className = 'panax-float-bar';
  floatBarEl.innerHTML = `
    <button class="panax-float-btn" data-cmd="bold" title="Жирный (Ctrl+B)"><b>Ж</b></button>
    <button class="panax-float-btn" data-cmd="italic" title="Курсив (Ctrl+I)"><i>К</i></button>
    <button class="panax-float-btn" data-cmd="underline" title="Подчёркнутый (Ctrl+U)"><u>Ч</u></button>
    <button class="panax-float-btn" data-cmd="strikeThrough" title="Зачёркнутый"><s>З</s></button>
    <div style="width:1px;height:16px;background:#2d374d;margin:0 3px;"></div>
    <button class="panax-float-btn" data-act="mark" title="Маркер">🖍</button>
    <button class="panax-float-btn" data-act="code" title="Код">&lt;/&gt;</button>
    <button class="panax-float-btn" data-act="chip" title="Сделать чипом игры">🎮</button>
    <div style="width:1px;height:16px;background:#2d374d;margin:0 3px;"></div>
    <button class="panax-float-btn" data-cmd="removeFormat" title="Очистить форматирование">⌫</button>
  `;

  document.body.appendChild(floatBarEl);

  floatBarEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  floatBarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd],[data-act]');
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    const act = btn.dataset.act;

    if (cmd) {
      exec(cmd);
      hideFloatBar();
      return;
    }

    if (act === 'mark') {
      restoreSelection();
      const sel = window.getSelection();
      const txt = sel ? sel.toString() : '';
      if (txt) {
        document.execCommand('insertHTML', false, `<mark style="background:rgba(255,200,74,0.32);color:#fff;padding:0 3px;border-radius:3px;">${txt}</mark>`);
      }
      hideFloatBar();
      return;
    }

    if (act === 'code') {
      restoreSelection();
      const sel = window.getSelection();
      const txt = sel ? sel.toString() : '';
      if (txt) {
        document.execCommand('insertHTML', false, `<code style="background:#0b0e16;border:1px solid #242c3d;padding:1px 6px;border-radius:6px;font-family:monospace;font-size:13px;color:#7ce7d4;">${txt}</code>`);
      }
      hideFloatBar();
      return;
    }

    if (act === 'chip') {
      restoreSelection();
      const sel = window.getSelection();
      const txt = sel ? sel.toString().trim() : '';
      if (txt) {
        const chipHtml = buildGameChipHtml(txt, `https://panaxgames.com/search?q=${encodeURIComponent(txt)}`);
        document.execCommand('insertHTML', false, chipHtml);
      } else {
        openInsertModal('chip', (html) => {
          restoreSelection();
          document.execCommand('insertHTML', false, html);
        });
      }
      hideFloatBar();
    }
  });

  return floatBarEl;
}

export function hideFloatBar() {
  if (floatBarEl) {
    floatBarEl.classList.remove('on');
  }
}

export function updateFloatBarPosition() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    hideFloatBar();
    return;
  }

  // Ensure selection is inside a contenteditable or Quill editor
  let anchor = sel.anchorNode;
  if (anchor && anchor.nodeType === 3) anchor = anchor.parentElement;
  if (!anchor || (!anchor.isContentEditable && !anchor.closest('[contenteditable="true"], .ql-editor'))) {
    hideFloatBar();
    return;
  }

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    hideFloatBar();
    return;
  }

  saveSelection();
  const bar = createFloatBar();
  bar.classList.add('on');

  const barW = bar.offsetWidth || 260;
  const barH = bar.offsetHeight || 38;

  let left = rect.left + rect.width / 2 - barW / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - barW - 10));

  let top = rect.top - barH - 8 + window.scrollY;
  if (rect.top - barH - 8 < 0) {
    top = rect.bottom + 8 + window.scrollY;
  }

  bar.style.left = `${left}px`;
  bar.style.top = `${top}px`;
}

export function startSelectionWatcher() {
  let timer = null;
  const check = () => {
    clearTimeout(timer);
    timer = setTimeout(updateFloatBarPosition, 80);
  };

  document.addEventListener('selectionchange', check);
  document.addEventListener('mouseup', check);
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.key.startsWith('Arrow')) check();
  });
  window.addEventListener('scroll', hideFloatBar, { passive: true });
}
