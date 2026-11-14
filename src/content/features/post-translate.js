import { translateText } from "../api/translate.js";
import { getSettings } from "../settings.js";
var BTN_CLASS = "panax-translate-btn";
var STATE_ATTR = "data-panax-translated";
var ORIG_ATTR = "data-panax-original";
var isListening = false;
function escapeHtml(str2) {
  return String(str2 || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function extractCleanText(el) {
  if (!el) return "";
  const clone = el.cloneNode(true);
  clone.querySelectorAll(
    '[aria-hidden="true"], .more-button-inline, .panax-translate-btn, .panax-translate-wrap, .view-all-wrapper, [id^="user-summary-"]'
  ).forEach((n) => n.remove());
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  clone.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6").forEach((block2) => {
    block2.append("\n");
  });
  return (clone.textContent || "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function plainToHtml(text) {
  return escapeHtml(String(text || "")).replace(/\r\n|\r|\n/g, "<br>");
}
function setBtnState(btn, state2) {
  if (!btn) return;
  if (state2 === "loading") {
    btn.innerHTML = `<span class="panax-translate-spin"></span><span>\u041F\u0435\u0440\u0435\u0432\u043E\u0434...</span>`;
    btn.classList.add("is-loading");
  } else if (state2 === "translated") {
    btn.innerHTML = `<span>\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B</span>`;
    btn.classList.remove("is-loading");
    btn.classList.add("is-translated");
    btn.setAttribute(STATE_ATTR, "true");
  } else if (state2 === "error") {
    btn.innerHTML = `<span>\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430</span>`;
    btn.classList.remove("is-loading");
    setTimeout(() => setBtnState(btn, "idle"), 1800);
  } else {
    btn.innerHTML = `<span>\u041F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438</span>`;
    btn.classList.remove("is-loading");
    btn.classList.remove("is-translated");
    btn.removeAttribute(STATE_ATTR);
  }
}
function createTranslateBtn(targetType = "review") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `${BTN_CLASS} ${BTN_CLASS}--${targetType}`;
  btn.setAttribute("data-target-type", targetType);
  btn.setAttribute("data-panax-ru-skip", "1");
  btn.innerHTML = `<span>\u041F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438</span>`;
  return btn;
}
function isEnglishText(text) {
  if (!text || text.length < 4) return false;
  const cleaned = text.replace(/https?:\/\/\S+/g, "").replace(/[@#][A-Za-z0-9_-]+/g, "");
  const latin = (cleaned.match(/[A-Za-z]/g) || []).length;
  const cyrillic = (cleaned.match(/[А-Яа-яЁё]/g) || []).length;
  return latin >= 4 && latin > cyrillic;
}
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
      const wrapper2 = deltaEl.querySelector(".content-wrapper");
      if (wrapper2) wrapper2.style.maxHeight = "";
      delete deltaEl.__panaxWasCollapsed;
    }
    return true;
  }
  const wrapper = deltaEl.querySelector(".content-wrapper > div") || deltaEl.querySelector(".content-wrapper") || deltaEl;
  const children = Array.from(wrapper.children).filter(
    (ch) => !ch.querySelector(".media-item, img, video") && !ch.classList.contains("media-item")
  );
  const hasMedia = !!wrapper.querySelector(".media-item, img, video");
  const targets = !hasMedia ? [wrapper] : children.filter((ch) => isEnglishText(extractCleanText(ch)));
  if (!targets.length) return false;
  const origBlocks = targets.map((el) => ({ el, html: el.innerHTML, text: extractCleanText(el) }));
  const combined = origBlocks.map((b) => b.text).join("\n\n===PANAX_SPLIT===\n\n");
  const res = await translateText(combined, "ru");
  if (!res?.text) return false;
  deltaEl.__panaxOrigBlocks = origBlocks;
  const contentWrapper = deltaEl.querySelector(".content-wrapper");
  if (contentWrapper && contentWrapper.classList.contains("content-wrapper-collapsed")) {
    contentWrapper.style.maxHeight = "none";
    deltaEl.__panaxWasCollapsed = true;
  }
  const parts = res.text.split(/\s*===\s*PANAX_SPLIT\s*===\s*/i);
  if (parts.length === origBlocks.length) {
    origBlocks.forEach((b, idx) => {
      b.el.innerHTML = `<span style="white-space: pre-wrap; color: var(--color-text-common-user-contents, #fff);">${plainToHtml(parts[idx].trim())}</span>`;
    });
  } else {
    origBlocks[0].el.innerHTML = `<span style="white-space: pre-wrap; color: var(--color-text-common-user-contents, #fff);">${plainToHtml(res.text.replace(/===\s*PANAX_SPLIT\s*===/gi, "\n\n").trim())}</span>`;
    for (let i = 1; i < origBlocks.length; i++) {
      origBlocks[i].el.innerHTML = "";
    }
  }
  return true;
}
async function handleTranslateClick(btn) {
  if (btn.classList.contains("is-loading")) return;
  const textEl = btn.__panaxTargetTextEl;
  if (!textEl) return;
  const isTranslated = btn.getAttribute(STATE_ATTR) === "true";
  if (textEl.classList?.contains("delta-content-renderer")) {
    if (isTranslated) {
      await translateDeltaRenderer(textEl, true);
      setBtnState(btn, "idle");
      return;
    }
    setBtnState(btn, "loading");
    const ok = await translateDeltaRenderer(textEl, false);
    setBtnState(btn, ok ? "translated" : "error");
    return;
  }
  if (isTranslated) {
    const original = textEl.__panaxOriginalHtml ?? textEl.getAttribute(ORIG_ATTR);
    if (original != null) {
      textEl.innerHTML = original;
      delete textEl.__panaxOriginalHtml;
      textEl.removeAttribute(ORIG_ATTR);
    }
    setBtnState(btn, "idle");
    return;
  }
  const sourceHtml = textEl.innerHTML;
  const plain = extractCleanText(textEl);
  if (!plain) return;
  setBtnState(btn, "loading");
  const res = await translateText(plain, "ru");
  if (!res?.text) {
    setBtnState(btn, "error");
    return;
  }
  textEl.__panaxOriginalHtml = sourceHtml;
  textEl.setAttribute(ORIG_ATTR, "1");
  textEl.innerHTML = `<span style="white-space: pre-wrap; display: block; color: var(--color-text-common-user-contents, #fff); font-size: 15px; line-height: 21px;">${plainToHtml(res.text)}</span>`;
  setBtnState(btn, "translated");
}
function findPostOrReviewBodyEl(cardRoot) {
  if (!cardRoot) return null;
  const delta = cardRoot.querySelector(".delta-content-renderer");
  if (delta && isEnglishText(extractCleanText(delta))) {
    return delta;
  }
  const candidates = cardRoot.querySelectorAll(
    'div[class*="text-(--color-text-common-user-contents)"], span[style*="color-text-common-user-contents"], span[style*="overflow-wrap: anywhere"], span[style*="overflowWrap"]'
  );
  for (const el of candidates) {
    if (el.closest(
      ".comment-item-container, .num-liked, .like-num-text, .buttons-post-smart, .buttons-review-smart, .post-game-tag, .attached-game-post, .top-text-post-compact, .spoiler-container"
    )) {
      continue;
    }
    const wrapper = el.closest('div[class*="whitespace-pre-wrap"]') || el.closest('div[style*="position: relative"][style*="width: 100%"]') || el.closest('div[style*="position:relative"]') || el.parentElement;
    if (wrapper && isEnglishText(extractCleanText(wrapper))) {
      return wrapper;
    }
  }
  return null;
}
function injectTranslateButtons() {
  const settings = getSettings();
  if (settings.showTranslate === false) {
    document.querySelectorAll(`.${BTN_CLASS}`).forEach((b) => b.remove());
    return;
  }
  const comments = document.querySelectorAll(".comment-item-container");
  for (const comment of comments) {
    if (comment.querySelector(`.${BTN_CLASS}`)) continue;
    const textContentEl = comment.querySelector(".comment-content .text-content");
    if (!textContentEl) continue;
    const plain = extractCleanText(textContentEl);
    if (!isEnglishText(plain)) continue;
    const btn = createTranslateBtn("review");
    btn.__panaxTargetTextEl = textContentEl;
    const commentInfo = comment.querySelector(".comment-info");
    if (commentInfo) {
      commentInfo.appendChild(btn);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "panax-translate-wrap mt-1";
      wrap.appendChild(btn);
      textContentEl.parentElement?.appendChild(wrap);
    }
  }
  const actionBars = document.querySelectorAll(".buttons-post, .buttons-review");
  for (const bar of actionBars) {
    if (bar.querySelector(`.${BTN_CLASS}`)) continue;
    const smartWrap = bar.closest(".buttons-post-smart, .buttons-review-smart") || bar;
    const cardRoot = smartWrap.closest('div[class*="bg-(--color-bg-layer-01"]') || smartWrap.parentElement?.parentElement;
    if (!cardRoot) continue;
    if (cardRoot.querySelector(`.${BTN_CLASS}`)) continue;
    const bodyEl = findPostOrReviewBodyEl(cardRoot);
    if (!bodyEl) continue;
    const btn = createTranslateBtn("review");
    btn.__panaxTargetTextEl = bodyEl;
    bar.appendChild(btn);
  }
  if (location.pathname.includes("/game-detail/")) {
    const descCandidates = document.querySelectorAll(
      '#collapseSummary, [class*="GameDetail_description"], [class*="description_wrap"], [class*="game_description"]'
    );
    for (const desc of descCandidates) {
      if (desc.closest("aside, nav, .comment-item-container")) continue;
      if (desc.querySelector(`.${BTN_CLASS}`) || desc.parentElement?.querySelector(`.${BTN_CLASS}`)) continue;
      const text = extractCleanText(desc);
      if (isEnglishText(text)) {
        const btn = createTranslateBtn("review");
        btn.__panaxTargetTextEl = desc;
        const wrap = document.createElement("div");
        wrap.className = "panax-translate-wrap mt-2";
        wrap.appendChild(btn);
        desc.after(wrap);
      }
    }
    const allUserText = document.querySelectorAll(
      'div[class*="text-(--color-text-common-user-contents)"], span[style*="color-text-common-user-contents"], p[class*="text-(--color-text-common"]'
    );
    for (const el of allUserText) {
      if (el.closest(
        'aside, nav, header, footer, .comment-item-container, .panax-plus-card, [class*="bg-(--color-bg-layer-01"] .buttons-post-smart, [class*="bg-(--color-bg-layer-01"] .buttons-review-smart'
      )) {
        continue;
      }
      const postCard = el.closest('div[class*="bg-(--color-bg-layer-01"]');
      if (postCard && postCard.querySelector(".buttons-post, .buttons-review")) continue;
      const block2 = el.closest('div[class*="whitespace-pre-wrap"]') || el.closest('div[style*="position: relative"][style*="width: 100%"]') || el;
      if (block2.querySelector(`.${BTN_CLASS}`) || block2.parentElement?.querySelector(`.${BTN_CLASS}`)) continue;
      const plain = extractCleanText(block2);
      if (plain.length >= 40 && isEnglishText(plain)) {
        const btn = createTranslateBtn("review");
        btn.__panaxTargetTextEl = block2;
        const wrap = document.createElement("div");
        wrap.className = "panax-translate-wrap mt-2";
        wrap.appendChild(btn);
        block2.after(wrap);
      }
    }
  }
}
export function startPostTranslate() {
  if (isListening) return;
  isListening = true;
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target?.closest?.(`.${BTN_CLASS}`);
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        handleTranslateClick(btn);
      }
    },
    true
  );
  injectTranslateButtons();
  setInterval(injectTranslateButtons, 700);
}
