var FOOTER_RE = /✦\s*Оформлено в GameQuill/;
var QUICK_VS = /[\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]/;
function isComposerPath(pathname = "") {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return /^\/(?:[a-z]{2}\/)?post\/write$/i.test(p);
}
function isComposerPage(loc = globalThis.location, root = document) {
  const p = loc && loc.pathname || "";
  if (isComposerPath(p)) return true;
  try {
    if (root && root.querySelector) {
      if (/post\/write/i.test(p) && root.querySelector(".ql-container, .ql-editor")) return true;
      if (root.querySelector(".new-post-header, .post-write-content")) return true;
    }
  } catch {
  }
  return false;
}
function isPostPage(loc = globalThis.location) {
  const p = (loc && loc.pathname || "").replace(/\/+$/, "") || "/";
  if (isComposerPath(p)) return false;
  if (/^\/post\/\d+$/.test(p)) return true;
  if (/^\/\d+$/.test(p)) return true;
  return false;
}
function looksLikePayloadText(text) {
  if (typeof text !== "string" || text.length < 8) return false;
  return FOOTER_RE.test(text) || QUICK_VS.test(text);
}
function carrierKeyFromText(text) {
  if (!text) return "";
  const bytes = vsExtract(text);
  return bytes ? "vs:" + toB64url(bytes) : "";
}
var SKIP = "[data-gq-view],[data-gq-preview],[data-panax-ru-skip],gq-composer,gq-composer-preview";
function contentRootFromMarker(node, loc = globalThis.location, root = document) {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  if (!el || !el.closest) return null;
  if (isComposerPage(loc, root) && el.closest(".ql-editor, .ql-container, .ql-toolbar")) return null;
  const rendered = el.closest(".delta-content-renderer");
  if (rendered) return rendered;
  const attributed = el.closest("[data-gq-carrier]");
  if (attributed) return attributed;
  while (el.parentElement && el.parentElement !== root.body && el.parentElement !== root.documentElement) {
    const p = el.parentElement;
    if (p.closest && p.closest(SKIP)) break;
    if (isComposerPage(loc, root) && p.closest(".ql-editor, .ql-container, .ql-toolbar")) return null;
    if (p.classList && p.classList.contains("delta-content-renderer")) return p;
    const et = (el.textContent || "").length;
    const pt = (p.textContent || "").length;
    if (pt > et * 1.8 + 120) break;
    if (p.classList && (p.classList.contains("card") || p.getAttribute("data-gq-view") != null)) break;
    el = p;
  }
  return el;
}
function findViewRoots(root = document, loc = globalThis.location) {
  const out = [];
  const seen2 = /* @__PURE__ */ new Set();
  const add = (el) => {
    if (!el || seen2.has(el) || el.closest && el.closest(SKIP)) return;
    if (isComposerPage(loc, root) && el.closest && el.closest(".ql-editor, .ql-container, .ql-toolbar")) return;
    seen2.add(el);
    out.push(el);
  };
  if (root.querySelectorAll) {
    root.querySelectorAll(".delta-content-renderer, [data-gq-carrier]").forEach(add);
  }
  const scope = root.documentElement || root.body || root;
  if (!scope || !root.createTreeWalker) return out;
  const walker = root.createTreeWalker(scope, 4, {
    acceptNode(n2) {
      const t = n2.nodeValue || "";
      if (!looksLikePayloadText(t)) return 3;
      return 1;
    }
  });
  let n;
  while (n = walker.nextNode()) add(contentRootFromMarker(n, loc, root));
  return out;
}
