/**
 * Enhanced Panax Editor Toolbar:
 * Injects modern formatting and GameQuill widget insertion buttons into
 * both post editor and review editor on panaxgames.com.
 */
import { openInsertModal } from './modal.js';
import { startSelectionWatcher } from './floating-bar.js';
import { enhanceWidgetsIn } from './viewer.js';
import { openGameQuillFullscreen } from './fullscreen.js';

const INJECTED_FLAG = 'data-panax-toolbar-injected';

function exec(cmd, val = null) {
  document.execCommand('styleWithCSS', false, false);
  document.execCommand(cmd, false, val);
}

function buildToolbarHtml() {
  return `
    <div class="panax-editor-group">
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="open-fullscreen" title="Открыть полноэкранный редактор GameQuill" style="background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;border-color:transparent;font-weight:700;">✨ GameQuill Fullscreen</button>
    </div>
    <div class="panax-editor-sep"></div>
    <div class="panax-editor-group">
      <button type="button" class="panax-tb-btn" data-cmd="bold" title="Жирный (Ctrl+B)"><b>Ж</b></button>
      <button type="button" class="panax-tb-btn" data-cmd="italic" title="Курсив (Ctrl+I)"><i>К</i></button>
      <button type="button" class="panax-tb-btn" data-cmd="underline" title="Подчёркнутый (Ctrl+U)"><u>Ч</u></button>
      <button type="button" class="panax-tb-btn" data-cmd="strikeThrough" title="Зачёркнутый"><s>З</s></button>
    </div>
    <div class="panax-editor-sep"></div>
    <div class="panax-editor-group">
      <button type="button" class="panax-tb-btn" data-cmd="formatBlock" data-val="H2" title="Заголовок H2"><b>H2</b></button>
      <button type="button" class="panax-tb-btn" data-cmd="formatBlock" data-val="H3" title="Подзаголовок H3"><b>H3</b></button>
      <button type="button" class="panax-tb-btn" data-cmd="formatBlock" data-val="BLOCKQUOTE" title="Цитата">❝</button>
      <button type="button" class="panax-tb-btn" data-cmd="insertUnorderedList" title="Маркированный список">•≡</button>
      <button type="button" class="panax-tb-btn" data-cmd="insertOrderedList" title="Нумерованный список">1≡</button>
    </div>
    <div class="panax-editor-sep"></div>
    <div class="panax-editor-group">
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-game" title="Вставить карточку игры">🎮 Игра</button>
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-steam" title="Вставить виджет Steam">♨️ Steam</button>
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-yt" title="Вставить видео YouTube">▶️ Видео</button>
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-pc" title="Вставить Плюсы и Минусы">⚖️ Плюсы/Минусы</button>
      <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-chip" title="Вставить чип игры в текст">🕹️ Чип</button>
    </div>
    <div class="panax-editor-sep"></div>
    <div class="panax-editor-group">
      <button type="button" class="panax-tb-btn" data-cmd="removeFormat" title="Очистить форматирование">⌫</button>
    </div>
  `;
}

function attachToolbarEvents(toolbar, targetEditable) {
  toolbar.addEventListener('mousedown', (e) => {
    // Prevent focus loss from target editable
    e.preventDefault();
  });

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd],[data-act]');
    if (!btn) return;
    targetEditable.focus();

    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val || null;
    const act = btn.dataset.act;

    if (cmd) {
      exec(cmd, val);
      return;
    }

    if (act === 'open-fullscreen') {
      openGameQuillFullscreen(targetEditable);
      return;
    }

    if (act === 'ins-game') {
      openInsertModal('game', (html) => {
        targetEditable.focus();
        document.execCommand('insertHTML', false, html);
        enhanceWidgetsIn(targetEditable);
      });
      return;
    }

    if (act === 'ins-steam') {
      openInsertModal('steam', (html) => {
        targetEditable.focus();
        document.execCommand('insertHTML', false, html);
        enhanceWidgetsIn(targetEditable);
      });
      return;
    }

    if (act === 'ins-yt') {
      openInsertModal('youtube', (html) => {
        targetEditable.focus();
        document.execCommand('insertHTML', false, html);
        enhanceWidgetsIn(targetEditable);
      });
      return;
    }

    if (act === 'ins-pc') {
      openInsertModal('proscons', (html) => {
        targetEditable.focus();
        document.execCommand('insertHTML', false, html);
        enhanceWidgetsIn(targetEditable);
      });
      return;
    }

    if (act === 'ins-chip') {
      openInsertModal('chip', (html) => {
        targetEditable.focus();
        document.execCommand('insertHTML', false, html);
      });
    }
  });
}

function injectToolbarInto(editorContainer, targetEditable) {
  if (editorContainer.hasAttribute(INJECTED_FLAG)) return;
  editorContainer.setAttribute(INJECTED_FLAG, 'true');

  const toolbar = document.createElement('div');
  toolbar.className = 'panax-editor-toolbar';
  toolbar.innerHTML = buildToolbarHtml();

  // Insert before the editable area
  editorContainer.insertBefore(toolbar, targetEditable);
  attachToolbarEvents(toolbar, targetEditable);
}

/**
 * Scan for post editor and review editor on Panax
 */
export function scanAndEnhanceEditors() {
  // 1. Look for Quill editors (like in Review / New Review dialog)
  const quillEditors = document.querySelectorAll('.ql-editor');
  quillEditors.forEach((editor) => {
    const container = editor.closest('.ql-container')?.parentElement || editor.parentElement;
    if (container && !container.hasAttribute(INJECTED_FLAG)) {
      // Check if standard Quill toolbar exists; if so, we enhance or prepend our extra tools
      const existingToolbar = container.querySelector('.ql-toolbar');
      if (existingToolbar) {
        if (!existingToolbar.hasAttribute(INJECTED_FLAG)) {
          existingToolbar.setAttribute(INJECTED_FLAG, 'true');
          const group = document.createElement('span');
          group.className = 'ql-formats';
          group.style.marginLeft = '8px';
          group.innerHTML = `
            <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="open-fullscreen" title="Открыть полноэкранный редактор GameQuill" style="height:26px;font-size:12px;padding:0 9px;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff;border:none;font-weight:700;">✨ GameQuill Fullscreen</button>
            <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-game" title="Вставить карточку игры" style="height:24px;font-size:11.5px;padding:0 6px;">🎮 Игра</button>
            <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-steam" title="Вставить Steam" style="height:24px;font-size:11.5px;padding:0 6px;">♨️ Steam</button>
            <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-yt" title="Вставить YouTube" style="height:24px;font-size:11.5px;padding:0 6px;">▶️ Видео</button>
            <button type="button" class="panax-tb-btn panax-tb-badge-btn" data-act="ins-pc" title="Плюсы и Минусы" style="height:24px;font-size:11.5px;padding:0 6px;">⚖️ ±</button>
          `;
          existingToolbar.appendChild(group);
          attachToolbarEvents(group, editor);
        }
      } else {
        injectToolbarInto(container, editor);
      }
    }
  });

  // 2. Look for regular post editor (contenteditable without quill, or textarea/post input)
  const contentEditables = document.querySelectorAll('[contenteditable="true"]:not(.ql-editor)');
  contentEditables.forEach((editable) => {
    // Only inject for main post composer areas
    const parent = editable.parentElement;
    if (parent && !parent.hasAttribute(INJECTED_FLAG)) {
      // Ensure it's not a tiny comment input or header
      const rect = editable.getBoundingClientRect();
      if (rect.height >= 40 || editable.getAttribute('data-placeholder') || editable.innerText.includes('О какой игре пост')) {
        injectToolbarInto(parent, editable);
      }
    }
  });

  // 3. Enhance any existing widgets in view (feed, details, posts)
  enhanceWidgetsIn(document);
}

let observerStarted = false;

export function startEditorEnhancement() {
  startSelectionWatcher();
  scanAndEnhanceEditors();

  if (!observerStarted) {
    observerStarted = true;
    const mo = new MutationObserver(() => {
      scanAndEnhanceEditors();
    });
    mo.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

