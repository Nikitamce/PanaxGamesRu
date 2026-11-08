/**
 * Enhanced Panax Editor Toolbar & Addbar:
 * Injects GameQuill Fullscreen launch bar and quick block insertion bar into
 * both post editor and review editor on panaxgames.com without breaking Quill CSS.
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

/**
 * Full formatting toolbar (used for regular post editor where Quill toolbar is absent)
 */
function buildFullPostToolbarHtml() {
  return `
    <div class="panax-editor-group">
      <button type="button" class="panax-fullscreen-btn" data-act="open-fullscreen" title="Открыть полноэкранный редактор GameQuill">✨ Открыть GameQuill на весь экран</button>
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
      <button type="button" class="panax-tb-btn" data-cmd="removeFormat" title="Очистить форматирование">⌫</button>
    </div>
  `;
}

/**
 * Quick block & widget addbar (matches screenshot 1 from sit3020.txt)
 */
function buildAddbarHtml(includeFullscreenBtn = false) {
  return `
    ${includeFullscreenBtn ? `<button type="button" class="panax-fullscreen-btn" data-act="open-fullscreen">✨ Редактор GameQuill (Full)</button>` : ''}
    <button type="button" class="panax-ghost-btn" data-cmd="formatBlock" data-val="P">¶ Текстовый блок</button>
    <button type="button" class="panax-ghost-btn" data-cmd="formatBlock" data-val="H2">H2 Заголовок</button>
    <button type="button" class="panax-ghost-btn" data-cmd="formatBlock" data-val="BLOCKQUOTE">❝ Цитата</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-hr">— Разделитель</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-game">🎮 Виджет игры</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-yt">▶️ Видео</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-steam">♨️ Steam</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-pc">⚖️ Плюсы / Минусы</button>
    <button type="button" class="panax-ghost-btn" data-act="ins-chip">🕹️ Чип-ссылка</button>
  `;
}

function attachBarEvents(barEl, targetEditable) {
  barEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  barEl.addEventListener('click', (e) => {
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

    if (act === 'ins-hr') {
      document.execCommand('insertHTML', false, '<hr><p><br></p>');
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

function injectIntoRegularPostEditor(editorContainer, targetEditable) {
  if (editorContainer.hasAttribute(INJECTED_FLAG)) return;
  editorContainer.setAttribute(INJECTED_FLAG, 'true');

  // Top formatting bar
  const toolbar = document.createElement('div');
  toolbar.className = 'panax-editor-toolbar';
  toolbar.innerHTML = buildFullPostToolbarHtml();
  editorContainer.insertBefore(toolbar, targetEditable);
  attachBarEvents(toolbar, targetEditable);

  // Dashed Addbar below top toolbar
  const addbar = document.createElement('div');
  addbar.className = 'panax-addbar';
  addbar.innerHTML = buildAddbarHtml(false);
  editorContainer.insertBefore(addbar, targetEditable);
  attachBarEvents(addbar, targetEditable);
}

function injectIntoQuillReviewEditor(quillContainer, targetEditable) {
  const wrapper = quillContainer.parentElement || quillContainer;
  if (wrapper.hasAttribute(INJECTED_FLAG)) return;
  wrapper.setAttribute(INJECTED_FLAG, 'true');

  // Put our clean dashed Addbar right above the .ql-container (so we don't touch .ql-toolbar's 28px button CSS!)
  const addbar = document.createElement('div');
  addbar.className = 'panax-addbar';
  addbar.innerHTML = buildAddbarHtml(true);

  wrapper.insertBefore(addbar, quillContainer);
  attachBarEvents(addbar, targetEditable);
}

/**
 * Scan for post editor and review editor on Panax
 */
export function scanAndEnhanceEditors() {
  // 1. Quill editors (Review modal / page)
  const quillEditors = document.querySelectorAll('.ql-editor');
  quillEditors.forEach((editor) => {
    const qlContainer = editor.closest('.ql-container') || editor.parentElement;
    if (qlContainer) {
      injectIntoQuillReviewEditor(qlContainer, editor);
    }
  });

  // 2. Regular post editor (contenteditable without quill)
  const contentEditables = document.querySelectorAll('[contenteditable="true"]:not(.ql-editor)');
  contentEditables.forEach((editable) => {
    // Skip elements inside our own GameQuill shadow host or modal
    if (editable.closest('#panax-gamequill-shadow-host, .panax-modal-overlay')) return;
    const parent = editable.parentElement;
    if (parent && !parent.hasAttribute(INJECTED_FLAG)) {
      const rect = editable.getBoundingClientRect();
      if (rect.height >= 40 || editable.getAttribute('data-placeholder') || editable.innerText.includes('О какой игре пост')) {
        injectIntoRegularPostEditor(parent, editable);
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
