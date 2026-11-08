import { translateText } from '../api/translate.js';
import { getSettings } from '../settings.js';

const BTN_CLASS = 'panax-translate-btn';
const STATE_ATTR = 'data-panax-translated';
const ORIG_ATTR = 'data-panax-original';

let isListening = false;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extract plain text from an element while skipping hidden measurement spans,
 * tooltips, and injected translate buttons.
 */
function extractCleanText(el) {
  if (!el) return '';
  const clone = el.cloneNode(true);
  clone
    .querySelectorAll(
      '[aria-hidden="true"], .more-button-inline, .panax-translate-btn, .panax-translate-wrap, .view-all-wrapper, [id^="user-summary-"]',
    )
    .forEach((n) => n.remove());
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6').forEach((block) => {
    block.append('\n');
  });
  return (clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainToHtml(text) {
  return escapeHtml(String(text || '')).replace(/\r\n|\r|\n/g, '<br>');
}

function setBtnState(btn, state) {
  if (!btn) return;
  if (state === 'loading') {
    btn.innerHTML = `<span class="panax-translate-spin"></span><span>Перевод...</span>`;
    btn.classList.add('is-loading');
  } else if (state === 'translated') {
    btn.innerHTML = `<span>Показать оригинал</span>`;
    btn.classList.remove('is-loading');
    btn.classList.add('is-translated');
    btn.setAttribute(STATE_ATTR, 'true');
  } else if (state === 'error') {
    btn.innerHTML = `<span>Ошибка перевода</span>`;
    btn.classList.remove('is-loading');
    setTimeout(() => setBtnState(btn, 'idle'), 1800);
  } else {
    btn.innerHTML = `<span>Перевести</span>`;
    btn.classList.remove('is-loading');
    btn.classList.remove('is-translated');
    btn.removeAttribute(STATE_ATTR);
  }
}

function createTranslateBtn(targetType = 'review') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `${BTN_CLASS} ${BTN_CLASS}--${targetType}`;
  btn.setAttribute('data-target-type', targetType);
  btn.setAttribute('data-panax-ru-skip', '1');
  btn.innerHTML = `<span>Перевести</span>`;
  return btn;
}

/**
 * Check if text contains enough English/Latin characters to warrant a Translate button.
 */
function isEnglishText(text) {
  if (!text || text.length < 4) return false;
  const cleaned = text.replace(/https?:\/\/\S+/g, '').replace(/[@#][A-Za-z0-9_-]+/g, '');
  const latin = (cleaned.match(/[A-Za-z]/g) || []).length;
  const cyrillic = (cleaned.match(/[А-Яа-яЁё]/g) || []).length;
  return latin >= 4 && latin > cyrillic;
}

/**
 * Translate a rich-text Quill / deltaContent container block-by-block so embedded
 * images and videos stay intact!
 */
async function translateDeltaRenderer(deltaEl, isRestore) {
  if (isRestore) {
    const saved = deltaEl.__panaxOrigBlocks;
    if (Array.isArray(saved)) {
      for (const item of saved) {
        if (item.el && item.html != null) {
          item.el.innerHTML = item.html;
        }
      }
      delete deltaEl.__panaxOrigBlocks;
    }
    if (deltaEl.__panaxWasCollapsed) {
      const wrapper = deltaEl.querySelector('.content-wrapper');
      if (wrapper) wrapper.style.maxHeight = '';
      delete deltaEl.__panaxWasCollapsed;
    }
    return true;
  }

  // Find text spans/divs inside .delta-content-renderer that do NOT contain media
  const wrapper = deltaEl.querySelector('.content-wrapper > div') || deltaEl.querySelector('.content-wrapper') || deltaEl;
  const children = Array.from(wrapper.children).filter(
    (ch) => !ch.querySelector('.media-item, img, video') && !ch.classList.contains('media-item'),
  );

  // If no direct text-only children or single container with no media, translate the whole text container
  const hasMedia = !!wrapper.querySelector('.media-item, img, video');
  const targets = !hasMedia ? [wrapper] : children.filter((ch) => isEnglishText(extractCleanText(ch)));

  if (!targets.length) return false;

  const origBlocks = targets.map((el) => ({ el, html: el.innerHTML, text: extractCleanText(el) }));
  const combined = origBlocks.map((b) => b.text).join('\n\n===PANAX_SPLIT===\n\n');

  const res = await translateText(combined, 'ru');
  if (!res?.text) return false;

  deltaEl.__panaxOrigBlocks = origBlocks;
  const contentWrapper = deltaEl.querySelector('.content-wrapper');
  if (contentWrapper && contentWrapper.classList.contains('content-wrapper-collapsed')) {
    contentWrapper.style.maxHeight = 'none';
    deltaEl.__panaxWasCollapsed = true;
  }

  const parts = res.text.split(/\s*===\s*PANAX_SPLIT\s*===\s*/i);
  if (parts.length === origBlocks.length) {
    origBlocks.forEach((b, idx) => {
      b.el.innerHTML = `<span style="white-space: pre-wrap; color: var(--color-text-common-user-contents, #fff);">${plainToHtml(parts[idx].trim())}</span>`;
    });
  } else {
    // Put full translation in first block and clear remaining text blocks
    origBlocks[0].el.innerHTML = `<span style="white-space: pre-wrap; color: var(--color-text-common-user-contents, #fff);">${plainToHtml(res.text.replace(/===\s*PANAX_SPLIT\s*===/gi, '\n\n').trim())}</span>`;
    for (let i = 1; i < origBlocks.length; i++) {
      origBlocks[i].el.innerHTML = '';
    }
  }
  return true;
}

/**
 * Handle translate toggle click
 */
async function handleTranslateClick(btn) {
  if (btn.classList.contains('is-loading')) return;

  const textEl = btn.__panaxTargetTextEl;
  if (!textEl) return;

  const isTranslated = btn.getAttribute(STATE_ATTR) === 'true';

  // Special handling for rich-text delta-content-renderer (reviews/posts with embedded images)
  if (textEl.classList?.contains('delta-content-renderer')) {
    if (isTranslated) {
      await translateDeltaRenderer(textEl, true);
      setBtnState(btn, 'idle');
      return;
    }
    setBtnState(btn, 'loading');
    const ok = await translateDeltaRenderer(textEl, false);
    setBtnState(btn, ok ? 'translated' : 'error');
    return;
  }

  // Standard element (post text, review text, comment text, game description)
  if (isTranslated) {
    const original = textEl.__panaxOriginalHtml ?? textEl.getAttribute(ORIG_ATTR);
    if (original != null) {
      textEl.innerHTML = original;
      delete textEl.__panaxOriginalHtml;
      textEl.removeAttribute(ORIG_ATTR);
    }
    setBtnState(btn, 'idle');
    return;
  }

  const sourceHtml = textEl.innerHTML;
  const plain = extractCleanText(textEl);
  if (!plain) return;

  setBtnState(btn, 'loading');

  const res = await translateText(plain, 'ru');
  if (!res?.text) {
    setBtnState(btn, 'error');
    return;
  }

  textEl.__panaxOriginalHtml = sourceHtml;
  textEl.setAttribute(ORIG_ATTR, '1');
  textEl.innerHTML = `<span style="white-space: pre-wrap; display: block; color: var(--color-text-common-user-contents, #fff); font-size: 15px; line-height: 21px;">${plainToHtml(res.text)}</span>`;
  setBtnState(btn, 'translated');
}

/**
 * Find the actual post or review body element inside a post/review card,
 * strictly ignoring `.num-liked` ("Nikitamce и другим помогло"), headers, and game tags.
 */
function findPostOrReviewBodyEl(cardRoot) {
  if (!cardRoot) return null;

  // 1. Check for rich-text Quill / deltaContent renderer first
  const delta = cardRoot.querySelector('.delta-content-renderer');
  if (delta && isEnglishText(extractCleanText(delta))) {
    return delta;
  }

  // 2. Check for Panax's TextDetector (`93327`) or user-content container
  // Every plain-text post or review uses `--color-text-common-user-contents` or `overflow-wrap: anywhere`
  const candidates = cardRoot.querySelectorAll(
    'div[class*="text-(--color-text-common-user-contents)"], span[style*="color-text-common-user-contents"], span[style*="overflow-wrap: anywhere"], span[style*="overflowWrap"]',
  );

  for (const el of candidates) {
    // Never match inside comments, liked-by bar, game tag, spoiler overlay, or user header
    if (
      el.closest(
        '.comment-item-container, .num-liked, .like-num-text, .buttons-post-smart, .buttons-review-smart, .post-game-tag, .attached-game-post, .top-text-post-compact, .spoiler-container',
      )
    ) {
      continue;
    }

    // Climb to the TextDetector wrapper div (`div[style*="position: relative"]`) or `div[class*="whitespace-pre-wrap"]`
    const wrapper =
      el.closest('div[class*="whitespace-pre-wrap"]') ||
      el.closest('div[style*="position: relative"][style*="width: 100%"]') ||
      el.closest('div[style*="position:relative"]') ||
      el.parentElement;

    if (wrapper && isEnglishText(extractCleanText(wrapper))) {
      return wrapper;
    }
  }

  return null;
}

/**
 * Scan DOM and inject Translate buttons into:
 * 1. Comments (`.comment-item-container`)
 * 2. Posts & Reviews (both in feed and on individual post/review detail pages)
 * 3. Game Descriptions (on `/game-detail/*`)
 */
export function injectTranslateButtons() {
  const settings = getSettings();
  if (settings.showTranslate === false) {
    document.querySelectorAll(`.${BTN_CLASS}`).forEach((b) => b.remove());
    return;
  }

  // =========================================================================
  // 1. COMMENTS (`.comment-item-container`)
  // =========================================================================
  const comments = document.querySelectorAll('.comment-item-container');
  for (const comment of comments) {
    if (comment.querySelector(`.${BTN_CLASS}`)) continue;

    const textContentEl = comment.querySelector('.comment-content .text-content');
    if (!textContentEl) continue;

    const plain = extractCleanText(textContentEl);
    if (!isEnglishText(plain)) continue;

    const btn = createTranslateBtn('review');
    btn.__panaxTargetTextEl = textContentEl;

    // Insert inside `.comment-info` (next to "Ответить" / likes) or right below `.text-content`
    const commentInfo = comment.querySelector('.comment-info');
    if (commentInfo) {
      commentInfo.appendChild(btn);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'panax-translate-wrap mt-1';
      wrap.appendChild(btn);
      textContentEl.parentElement?.appendChild(wrap);
    }
  }

  // =========================================================================
  // 2. POSTS & REVIEWS (Feed cards & Individual Post/Review detail pages)
  // Every post has `.buttons-post` inside `.buttons-post-smart`
  // Every review has `.buttons-review` inside `.buttons-review-smart`
  // =========================================================================
  const actionBars = document.querySelectorAll('.buttons-post, .buttons-review');
  for (const bar of actionBars) {
    if (bar.querySelector(`.${BTN_CLASS}`)) continue;

    // Climb to the post/review card root (`e4` component in Panax)
    const smartWrap = bar.closest('.buttons-post-smart, .buttons-review-smart') || bar;
    const cardRoot =
      smartWrap.closest('div[class*="bg-(--color-bg-layer-01"]') ||
      smartWrap.parentElement?.parentElement;

    if (!cardRoot) continue;
    if (cardRoot.querySelector(`.${BTN_CLASS}`)) continue;

    const bodyEl = findPostOrReviewBodyEl(cardRoot);
    if (!bodyEl) continue;

    const btn = createTranslateBtn('review');
    btn.__panaxTargetTextEl = bodyEl;

    // Place the Translate button cleanly inside the reaction bar row (`.buttons-post` or `.buttons-review`)
    bar.appendChild(btn);
  }

  // =========================================================================
  // 3. GAME DESCRIPTIONS (on `/game-detail/*` pages)
  // =========================================================================
  if (location.pathname.includes('/game-detail/')) {
    const descCandidates = document.querySelectorAll(
      '#collapseSummary, [class*="GameDetail_description"], [class*="description_wrap"], [class*="game_description"]',
    );
    for (const desc of descCandidates) {
      if (desc.closest('aside, nav, .comment-item-container')) continue;
      if (desc.querySelector(`.${BTN_CLASS}`) || desc.parentElement?.querySelector(`.${BTN_CLASS}`)) continue;
      const text = extractCleanText(desc);
      if (isEnglishText(text)) {
        const btn = createTranslateBtn('review');
        btn.__panaxTargetTextEl = desc;
        const wrap = document.createElement('div');
        wrap.className = 'panax-translate-wrap mt-2';
        wrap.appendChild(btn);
        desc.after(wrap);
      }
    }

    // Also check Panax's game header / "Об игре" description text block on game-detail
    const allUserText = document.querySelectorAll(
      'div[class*="text-(--color-text-common-user-contents)"], span[style*="color-text-common-user-contents"], p[class*="text-(--color-text-common"]',
    );
    for (const el of allUserText) {
      if (
        el.closest(
          'aside, nav, header, footer, .comment-item-container, .panax-plus-card, [class*="bg-(--color-bg-layer-01"] .buttons-post-smart, [class*="bg-(--color-bg-layer-01"] .buttons-review-smart',
        )
      ) {
        continue;
      }
      // Skip if inside a post or review card that has `.buttons-post` or `.buttons-review`
      const postCard = el.closest('div[class*="bg-(--color-bg-layer-01"]');
      if (postCard && postCard.querySelector('.buttons-post, .buttons-review')) continue;

      const block =
        el.closest('div[class*="whitespace-pre-wrap"]') ||
        el.closest('div[style*="position: relative"][style*="width: 100%"]') ||
        el;

      if (block.querySelector(`.${BTN_CLASS}`) || block.parentElement?.querySelector(`.${BTN_CLASS}`)) continue;
      const plain = extractCleanText(block);
      if (plain.length >= 40 && isEnglishText(plain)) {
        const btn = createTranslateBtn('review');
        btn.__panaxTargetTextEl = block;
        const wrap = document.createElement('div');
        wrap.className = 'panax-translate-wrap mt-2';
        wrap.appendChild(btn);
        block.after(wrap);
      }
    }
  }
}

export function startPostTranslate() {
  if (isListening) return;
  isListening = true;

  // Use capture phase so Panax's card click handler (`toPostDetail`) never intercepts our Translate button click!
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target?.closest?.(`.${BTN_CLASS}`);
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        handleTranslateClick(btn);
      }
    },
    true,
  );

  injectTranslateButtons();
  setInterval(injectTranslateButtons, 700);
}
