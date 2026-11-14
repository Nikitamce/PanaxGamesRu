import { toB64url, findTextCarriers, carrierFromDelta } from "../../shared/gq-payload.js";
import { base64ToBytes, uploadImageToPanax } from "../../shared/gq-image.js";
import { rewriteActionBody, toQuillOps } from "./action-rewrite.js";

var SS_KEY = "gq:carriers";
var MAX_MAP = 60;
function readMap() {
  try {
    const m = JSON.parse(sessionStorage.getItem(SS_KEY) || "{}");
    return m && typeof m === "object" ? m : {};
  } catch {
    return {};
  }
}
function remember(postId, carrier) {
  if (!postId || !carrier) return;
  try {
    const m = readMap();
    if (m[postId] === carrier) return;
    delete m[postId];
    m[postId] = carrier;
    const keys = Object.keys(m);
    while (keys.length > MAX_MAP) delete m[keys.shift()];
    sessionStorage.setItem(SS_KEY, JSON.stringify(m));
  } catch {
  }
}
function fiberOf(el) {
  for (const k in el) if (k.startsWith("__reactFiber$")) return el[k];
  return null;
}
function carrierString(delta) {
  const c = carrierFromDelta(delta);
  if (!c) return "";
  return c.kind === "attr" ? c.text : "vs:" + toB64url(c.bytes);
}
function postIdFrom(fiber) {
  let f = fiber;
  for (let i = 0; f && i < 40; i++, f = f.return) {
    const p = f.memoizedProps;
    if (!p || typeof p !== "object") continue;
    const id = p.id ?? (p.post && p.post.id) ?? p.postId;
    if ((typeof id === "number" || typeof id === "string" && /^\d{1,20}$/.test(id)) && i > 0) return String(id);
  }
  return "";
}
var seen = /* @__PURE__ */ new WeakMap();
function scanRenderers() {
  const list = document.querySelectorAll(".delta-content-renderer");
  for (const el of list) {
    const fiber = fiberOf(el);
    if (!fiber) continue;
    let delta = null;
    let f = fiber;
    for (let i = 0; f && i < 8; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p && p.deltaContent) {
        delta = p.deltaContent;
        break;
      }
    }
    if (seen.get(el) === delta) continue;
    seen.set(el, delta);
    let obj = delta;
    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch {
        obj = null;
      }
    }
    const carrier = obj ? carrierString(obj) : "";
    if (!carrier) {
      if (el.hasAttribute("data-gq-carrier")) el.removeAttribute("data-gq-carrier");
      continue;
    }
    const pid = postIdFrom(fiber);
    if (pid) {
      el.setAttribute("data-gq-post-id", pid);
      remember(pid, carrier);
    }
    if (el.getAttribute("data-gq-carrier") !== carrier) el.setAttribute("data-gq-carrier", carrier);
  }
}
var scanQueued = false;
function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  setTimeout(() => {
    scanQueued = false;
    try {
      scanRenderers();
    } catch {
    }
  }, 120);
}
export var armed = null;
function findQuill() {
  const container = document.querySelector(".ql-container");
  if (!container) return null;
  if (container.__quill) return container.__quill;
  let f = fiberOf(container) || fiberOf(container.querySelector(".ql-editor") || container);
  for (let i = 0; f && i < 30; i++, f = f.return) {
    const sn = f.stateNode;
    if (sn && typeof sn === "object") {
      if (sn.quill && typeof sn.quill.setContents === "function") return sn.quill;
      if (sn.editor && typeof sn.editor.setContents === "function") return sn.editor;
      if (typeof sn.getEditor === "function") {
        try {
          const q = sn.getEditor();
          if (q && typeof q.setContents === "function") return q;
        } catch {
        }
      }
    }
    const ref = f.ref && typeof f.ref === "object" ? f.ref.current : null;
    if (ref && ref.quill && typeof ref.quill.setContents === "function") return ref.quill;
    const pr = f.memoizedProps && f.memoizedProps.ref;
    if (pr && typeof pr === "object" && pr.current && pr.current.quill) return pr.current.quill;
  }
  return null;
}
function pasteInto(html, text) {
  const ed = document.querySelector(".ql-editor");
  if (!ed) return false;
  ed.focus();
  try {
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(ed);
    sel.removeAllRanges();
    sel.addRange(r);
  } catch {
  }
  const dt = new DataTransfer();
  dt.setData("text/html", html);
  dt.setData("text/plain", text);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  ed.dispatchEvent(ev);
  return ev.defaultPrevented;
}
function onArm(e) {
  let d;
  try {
    d = JSON.parse(String(e.detail || ""));
  } catch {
    return;
  }
  if (!d || !Array.isArray(d.ops) || typeof d.plain !== "string") return;
  armed = { ops: d.ops, plain: d.plain, at: Date.now() };
  const wantEmbeds = (d.ops || []).filter((o) => o && o.insert && typeof o.insert === "object" && o.insert["custom-image"]).length;
  const fillQuill = (source) => {
    const q = findQuill();
    if (!q) return "";
    q.setContents({ ops: toQuillOps(d.ops) }, source);
    return "quill";
  };
  let method = "";
  try {
    method = fillQuill("user") || "";
  } catch {
    method = "";
  }
  if (method === "quill" && wantEmbeds > 1) {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (!armed || Date.now() - armed.at > 8e3 || n > 12) {
        clearInterval(t);
        return;
      }
      try {
        const q = findQuill();
        if (!q || typeof q.getContents !== "function") return;
        const got = (q.getContents().ops || []).filter((o) => o && o.insert && typeof o.insert === "object" && o.insert["custom-image"]).length;
        if (got < wantEmbeds) fillQuill("user");
      } catch {
      }
    }, 400);
  }
  if (!method) {
    try {
      if (pasteInto(String(d.html || ""), d.plain)) method = "paste";
    } catch {
    }
  }
  document.dispatchEvent(new CustomEvent("gq:armed", { detail: JSON.stringify({ ok: !!method, method }) }));
}
function onDisarm() {
  armed = null;
}
function headerValue(headers, name) {
  if (!headers) return null;
  try {
    if (headers instanceof Headers) return headers.get(name);
    if (Array.isArray(headers)) {
      const h2 = headers.find((x) => String(x[0]).toLowerCase() === name.toLowerCase());
      return h2 ? h2[1] : null;
    }
    for (const k of Object.keys(headers)) if (k.toLowerCase() === name.toLowerCase()) return headers[k];
  } catch {
  }
  return null;
}
var decide = ({ changed }) => {
  if (!changed) return true;
  return window.confirm(
    "GameQuill: \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0441\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438 \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430 \u0438\u0437 GameQuill.\n\n\u041E\u041A: \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E \u0438\u0437 GameQuill (\u043F\u0440\u0430\u0432\u043A\u0438, \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u044B\u0435 \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435 \u0441\u0430\u0439\u0442\u0430, \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442).\n\u041E\u0442\u043C\u0435\u043D\u0430: \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0435\u0441\u0442\u044C, \u0431\u0435\u0437 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F GameQuill."
  );
};
function rewriteBody(body) {
  if (!armed) return null;
  if (typeof body === "string") {
    const r = rewriteActionBody(body, armed, decide);
    return r ? { body: r.body, rewritten: r.rewritten } : null;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    let hit = null;
    const fd = new FormData();
    for (const [k, v] of body.entries()) {
      if (!hit && typeof v === "string" && v.includes("delta_content")) {
        const r = rewriteActionBody(v, armed, decide);
        if (r) {
          hit = r;
          fd.append(k, r.body);
          continue;
        }
      }
      fd.append(k, v);
    }
    return hit ? { body: fd, rewritten: hit.rewritten } : null;
  }
  return null;
}
function scanResponse(res) {
  try {
    const m = /^\/post\/write/.test(location.pathname) ? new URLSearchParams(location.search).get("id") : null;
    res.clone().text().then((t) => {
      const found = findTextCarriers(t);
      if (found.length && m && found.length === 1) remember(String(m).replace(/\D/g, ""), found[0]);
      if (found.length) queueScan();
    }).catch(() => {
    });
  } catch {
  }
}
function patchFetch() {
  const orig = window.fetch;
  if (typeof orig !== "function" || orig.__gqPatched) return;
  const patched = function(input, init) {
    let isAction = false;
    try {
      const hdr = headerValue(init && init.headers, "Next-Action") || (input instanceof Request ? input.headers.get("Next-Action") : null);
      isAction = !!hdr && (!init || !init.method || String(init.method).toUpperCase() === "POST");
      if (isAction && armed && init && init.body != null) {
        const r = rewriteBody(init.body);
        if (r && r.rewritten) {
          init = { ...init, body: r.body };
          const p2 = orig.call(this, input, init);
          return p2.then((res) => {
            if (res && res.ok) armed = null;
            return res;
          });
        }
      }
    } catch (err) {
      console.warn("[GameQuill] request hook error", err);
    }
    const p = orig.call(this, input, init);
    if (isAction) p.then(scanResponse, () => {
    });
    return p;
  };
  patched.__gqPatched = true;
  window.fetch = patched;
}
async function onUpload(e) {
  let msg;
  try {
    msg = JSON.parse(e.detail || "{}");
  } catch {
    return;
  }
  const reply = (res) => {
    document.dispatchEvent(new CustomEvent("gq:upload-done", { detail: JSON.stringify({ reqId: msg.reqId, ...res }) }));
  };
  try {
    const bytes = base64ToBytes(msg.b64 || "");
    const res = await uploadImageToPanax({
      bytes,
      contentType: msg.contentType || "image/jpeg",
      width: msg.width || 0,
      height: msg.height || 0,
      pageOrigin: location.origin
    });
    reply(res);
  } catch (err) {
    reply({ ok: false, code: "error", error: err && err.message || "\u043E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" });
  }
}
export function startGameQuillMain() {
  if (globalThis.__GQ_MAIN__) return;
  globalThis.__GQ_MAIN__ = true;
  if (false) {
    setAllowedImageOrigins(["http://localhost:8765", "http://127.0.0.1:8765"]);
  }
  patchFetch();
  document.addEventListener("gq:arm", onArm);
  document.addEventListener("gq:disarm", onDisarm);
  document.addEventListener("gq:rescan", queueScan);
  document.addEventListener("gq:upload", onUpload);
  const start2 = () => {
    queueScan();
    new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(queueScan, 2e3);
  };
  if (document.documentElement) start2();
  else document.addEventListener("DOMContentLoaded", start2, { once: true });
}
