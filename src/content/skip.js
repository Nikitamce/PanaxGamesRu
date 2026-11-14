var SKIP_ROOT_SELECTORS = [
  '[contenteditable="true"]',
  "[data-panax-ru-skip]",
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
  '[class*="PostText"]'
];
var AMBIGUOUS_SHORT = new Set(
  [
    "Hot",
    "New",
    "HOT",
    "NEW",
    "List",
    "Lists",
    "Following",
    "Followers",
    "Follower",
    "Follow",
    "Rating",
    "Ratings",
    "Similar",
    "Latest",
    "News",
    "Discover",
    "Store",
    "Home",
    "More",
    "Share",
    "Edit",
    "Save",
    "Cancel",
    "Close",
    "Back",
    "Next",
    "Previous",
    "All",
    "Top",
    "Best",
    "Free",
    "Owned",
    "Playing",
    "Played",
    "Completed",
    "Dropped",
    "Paused",
    "Wishlist",
    "Status",
    "Release",
    "About",
    "Create",
    "Post",
    "Like",
    "On",
    "To",
    "And",
    "Confirm",
    "Verify"
  ].map((s) => s.toLowerCase())
);
var CHROME_HINT = /(?:^|[\s_])(?:tab-button|button-label|game-follow|rounded-full|navbar|header|footer|cookie|modal|dialog|drawer|badge|chip|pill|sidebar|toolbar|menu-item|dropdown|picker|audience|cursor-pointer|game-detail|game-info|game-stat|stat-label|status-picker|more-button|notification|notice|popover)(?:$|[\s_]|\b)/i;
var CHROME_TAGS = /* @__PURE__ */ new Set(["BUTTON", "A", "LABEL", "NAV", "HEADER", "FOOTER", "OPTION", "SUMMARY", "ASIDE"]);
export function isChromeContext(el) {
  if (!el || el.nodeType !== 1) return false;
  let cur = el;
  let depth = 0;
  while (cur && depth < 14) {
    if (CHROME_TAGS.has(cur.tagName)) return true;
    const role = cur.getAttribute?.("role");
    if (role === "button" || role === "tab" || role === "navigation" || role === "banner" || role === "complementary" || role === "dialog" || role === "menu" || role === "menuitem" || role === "combobox" || role === "listbox" || role === "option") {
      return true;
    }
    if (cur.getAttribute?.("aria-haspopup") || cur.getAttribute?.("aria-expanded")) return true;
    const cls = cur.className && String(cur.className);
    if (cls && CHROME_HINT.test(cls)) return true;
    if (cur.matches?.('header, nav, footer, aside, [data-panax-ru="pill"], [data-panax-ru="label"]')) {
      return true;
    }
    if (depth <= 2 && cur.parentElement?.querySelector('svg, button, a[href*="back"], [class*="back"]')) {
      return true;
    }
    if (depth <= 2) {
      if (cur.nextElementSibling?.tagName === "SVG" || cur.previousElementSibling?.tagName === "SVG") {
        return true;
      }
      if (cls && cls.includes("cursor-pointer")) return true;
    }
    if (depth <= 3) {
      const prev = cur.previousElementSibling;
      if (prev && /^\d[\d.,]*\s*[kKmMbB]?$/.test((prev.textContent || "").trim())) return true;
      const parentFirst = cur.parentElement?.firstElementChild;
      if (parentFirst && parentFirst !== cur && /^\d[\d.,]*\s*[kKmMbB]?$/.test((parentFirst.textContent || "").trim())) {
        return true;
      }
    }
    cur = cur.parentElement;
    depth += 1;
  }
  return false;
}
export function shouldSkipRoot(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.getAttribute?.("contenteditable") === "true" || el.isContentEditable) return true;
  if (el.closest?.("[data-panax-ru-skip]")) return true;
  if (el.closest?.('button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], select, [data-panax-ru="pill"], [data-panax-ru="label"]')) {
    return false;
  }
  for (const sel of SKIP_ROOT_SELECTORS) {
    try {
      if (el.matches?.(sel) || el.closest?.(sel)) return true;
    } catch {
    }
  }
  if (el.closest?.('[role="dialog"], [role="menu"], [class*="notification"], [class*="Notification"], [class*="popover"]')) {
    return false;
  }
  return false;
}
export function shouldSkipProse(el, text) {
  if (!el || !text) return false;
  if (!isChromeContext(el)) return true;
  return false;
}
