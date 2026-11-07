/** Tags that never hold translatable chrome. SVG is walked for <text>/<tspan>. */
export const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'CODE',
  'PRE',
  'CANVAS',
  'MATH',
  'KBD',
  'SAMP',
]);

/** Skip descending into these, except SVG text nodes. */
export const SKIP_DESCENT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS']);

/**
 * User / editorial content: do not rewrite descendants.
 * Do NOT blanket-skip bare <article> — game detail pages use it for chrome too.
 */
export const SKIP_ROOT_SELECTORS = [
  '[contenteditable="true"]',
  '[data-panax-ru-skip]',
  '[class*="post-body"]',
  '[class*="PostBody"]',
  '[class*="post_body"]',
  '[class*="post-content"]',
  '[class*="PostContent"]',
  '[class*="review-body"]',
  '[class*="ReviewBody"]',
  '[class*="review-content"]',
  '[class*="ReviewContent"]',
  '[class*="comment-body"]',
  '[class*="CommentBody"]',
  '[class*="comment-content"]',
  '[class*="CommentContent"]',
  '[class*="activity-body"]',
  '[class*="ActivityBody"]',
  '[class*="feed-item-body"]',
  '[class*="FeedItemBody"]',
  '[class*="user-content"]',
  '[class*="UserContent"]',
  '[class*="user-contents"]',
  '[class*="rich-text"]',
  '[class*="RichText"]',
  '[class*="prose"]',
  '[class*="markdown"]',
  '[class*="editor-content"]',
  '[class*="deltaContent"]',
  '[class*="post-text"]',
  '[class*="PostText"]',
];

/** Ambiguous short English chrome — only translate inside UI chrome, never in posts. */
export const AMBIGUOUS_SHORT = new Set(
  [
    'Hot',
    'New',
    'HOT',
    'NEW',
    'List',
    'Lists',
    'Following',
    'Followers',
    'Follower',
    'Follow',
    'Rating',
    'Ratings',
    'Similar',
    'Latest',
    'News',
    'Discover',
    'Store',
    'Home',
    'More',
    'Share',
    'Edit',
    'Save',
    'Cancel',
    'Close',
    'Back',
    'Next',
    'Previous',
    'All',
    'Top',
    'Best',
    'Free',
    'Owned',
    'Playing',
    'Played',
    'Completed',
    'Dropped',
    'Paused',
    'Wishlist',
    'Status',
    'Release',
    'About',
    'Create',
    'Post',
    'Like',
    'On',
    'To',
    'And',
  ].map((s) => s.toLowerCase()),
);

/** Ancestor looks like site chrome. Word-boundary so "button" inside unrelated classes does not match. */
const CHROME_HINT =
  /(?:^|[\s_])(?:tab-button|game-follow|rounded-full|navbar|header|footer|cookie|modal|dialog|drawer|badge|chip|pill|sidebar|toolbar|menu-item|dropdown|game-detail|game-info|game-stat|stat-label|status-picker|more-button|opacity-\[var\(--opacity-)(?:$|[\s_]|\b)/i;

const CHROME_TAGS = new Set(['BUTTON', 'A', 'LABEL', 'NAV', 'HEADER', 'FOOTER', 'OPTION', 'SUMMARY', 'ASIDE']);

/**
 * @param {Element | null} el
 */
export function isChromeContext(el) {
  if (!el || el.nodeType !== 1) return false;
  let cur = el;
  let depth = 0;
  while (cur && depth < 14) {
    if (CHROME_TAGS.has(cur.tagName)) return true;
    const role = cur.getAttribute?.('role');
    if (
      role === 'button' ||
      role === 'tab' ||
      role === 'navigation' ||
      role === 'banner' ||
      role === 'complementary' ||
      role === 'dialog' ||
      role === 'menu' ||
      role === 'listbox' ||
      role === 'option'
    ) {
      return true;
    }
    const cls = cur.className && String(cur.className);
    if (cls && CHROME_HINT.test(cls)) return true;
    if (cur.matches?.('header, nav, footer, aside, [data-panax-ru="pill"], [data-panax-ru="label"]')) {
      return true;
    }
    // Stats under a count: sibling/parent looks numeric (12.1k / 10)
    if (depth <= 3) {
      const prev = cur.previousElementSibling;
      if (prev && /^\d[\d.,]*\s*[kKmMbB]?$/.test((prev.textContent || '').trim())) return true;
      const parentFirst = cur.parentElement?.firstElementChild;
      if (
        parentFirst &&
        parentFirst !== cur &&
        /^\d[\d.,]*\s*[kKmMbB]?$/.test((parentFirst.textContent || '').trim())
      ) {
        return true;
      }
    }
    cur = cur.parentElement;
    depth += 1;
  }
  return false;
}

/**
 * @param {Element | null} el
 */
export function shouldSkipRoot(el) {
  if (!el || el.nodeType !== 1) return false;
  for (const sel of SKIP_ROOT_SELECTORS) {
    try {
      if (el.matches?.(sel) || el.closest?.(sel)) return true;
    } catch {
      /* invalid selector */
    }
  }
  return false;
}

/**
 * Long prose outside chrome — leave user/editorial text alone.
 * @param {Element | null} el
 * @param {string} text
 */
export function shouldSkipProse(el, text) {
  if (!el || !text) return false;
  // Posts are word-split spans. Any exact dict hit ("Post", "Like", "On", "To")
  // would rewrite user text. Translate only inside UI chrome.
  if (!isChromeContext(el)) return true;
  return false;
}
