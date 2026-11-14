var MAX_DATA_IMAGE = 40 * 1024;
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
var COMPRESS_MAX_EDGE = 1600;
var COMPRESS_QUALITY = 0.82;
var LOCAL_TARGET_BYTES = 28 * 1024;
var PANAX_IMAGE_CDN = "https://d21t60rno19oyf.cloudfront.net";
var UUID_RE = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
var PANAX_INPUT_RE = new RegExp("^/image/input/(" + UUID_RE + ")$");
var PANAX_DERIV_RE = new RegExp("^/image/(large|medium|small)/(" + UUID_RE + ")\\.webp$", "i");
var SIGNED_PARAM_RE = /^(AWSAccessKeyId|Signature|Expires|x-amz-security-token|X-Amz-Algorithm|X-Amz-Credential|X-Amz-Date|X-Amz-Expires|X-Amz-SignedHeaders|X-Amz-Signature|X-Amz-Security-Token|content-type|x-amz-meta-.+)$/i;
var extraAllowedOrigins = [];
var encodeUnsafe = (href) => href.replace(/['"()\\\s<>`]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
var PRIVATE_HOST = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)$/i;
var PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/;
function isPrivateHost(host) {
  const h = String(host || "").toLowerCase();
  if (PRIVATE_HOST.test(h) || h.endsWith(".local") || h.endsWith(".localhost")) return true;
  if (PRIVATE_IP.test(h)) return true;
  return false;
}
function hasSignedQuery(urlOrSearch) {
  try {
    const u = typeof urlOrSearch === "string" && urlOrSearch.includes("://") ? new URL(urlOrSearch) : null;
    const params = u ? u.searchParams : new URLSearchParams(String(urlOrSearch || "").replace(/^\?/, ""));
    for (const k of params.keys()) if (SIGNED_PARAM_RE.test(k)) return true;
    return false;
  } catch {
    return /AWSAccessKeyId|X-Amz-Signature|x-amz-security-token|X-Amz-Security-Token/i.test(String(urlOrSearch || ""));
  }
}
function toPublicPanaxImageUrl(v, opts = {}) {
  try {
    const u = new URL(String(v || "").trim());
    const input = PANAX_INPUT_RE.exec(u.pathname);
    const deriv = PANAX_DERIV_RE.exec(u.pathname);
    if (!input && !deriv) return "";
    const path = input ? "/image/input/" + input[1].toLowerCase() : "/image/" + deriv[1].toLowerCase() + "/" + deriv[2].toLowerCase() + ".webp";
    if (isAllowedExtraOrigin(u)) return u.origin + path;
    if (opts.pageOrigin && originsEqual(u, opts.pageOrigin)) return u.origin + path;
    if (isPrivateHost(u.hostname)) return "";
    return PANAX_IMAGE_CDN + path;
  } catch {
    return "";
  }
}
function isAllowedExtraOrigin(u) {
  for (const o of extraAllowedOrigins) {
    try {
      const a = new URL(o);
      if (a.protocol === u.protocol && a.hostname === u.hostname && (a.port || defaultPort(a.protocol)) === (u.port || defaultPort(u.protocol))) return true;
    } catch {
    }
  }
  return false;
}
function defaultPort(proto) {
  return proto === "https:" ? "443" : proto === "http:" ? "80" : "";
}
function safeUserImageUrl(v, opts = {}) {
  const maxData = opts.maxData ?? MAX_DATA_IMAGE;
  if (v == null) return "";
  const raw = String(v).trim();
  if (!raw) return "";
  if (/^data:/i.test(raw)) {
    const compact = raw.replace(/\s+/g, "");
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(compact);
    if (!m) return "";
    if (compact.length > maxData) return "";
    return compact;
  }
  const panax = toPublicPanaxImageUrl(raw);
  if (panax) return encodeUnsafe(panax);
  try {
    const u = new URL(raw);
    if (u.username || u.password) return "";
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (hasSignedQuery(u)) {
      u.search = "";
      u.hash = "";
    }
    const extra = isAllowedExtraOrigin(u);
    if (isPrivateHost(u.hostname)) {
      if (!extra) return "";
    } else if (u.protocol === "http:") {
      u.protocol = "https:";
    } else if (u.protocol !== "https:") {
      return "";
    }
    if (u.href.length > 2048) return "";
    return encodeUnsafe(u.href);
  } catch {
    return "";
  }
}
function originsEqual(u, origin) {
  try {
    const o = new URL(origin);
    return o.protocol === u.protocol && o.hostname === u.hostname && (o.port || defaultPort(o.protocol)) === (u.port || defaultPort(u.protocol));
  } catch {
    return false;
  }
}
function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
  let s = "";
  const chunk = 32768;
  for (let i = 0; i < u8.length; i += chunk) s += String.fromCharCode(...u8.subarray(i, i + chunk));
  return btoa(s);
}
function base64ToBytes(b64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(String(b64), "base64"));
  const bin = atob(String(b64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function dataUrlToBytes(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUrl || "").replace(/\s+/g, ""));
  if (!m) return null;
  return { type: m[1], bytes: base64ToBytes(m[2]) };
}
function isRasterImageType(type) {
  return /^(image\/(png|jpe?g|webp|gif))$/i.test(String(type || ""));
}
function isGifBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : bytes ? new Uint8Array(bytes) : new Uint8Array();
  return u8.length >= 6 && u8[0] === 71 && u8[1] === 73 && u8[2] === 70 && u8[3] === 56;
}
function shouldPreserveAnimation(file, bytes) {
  const type = file && file.type || "";
  const name = file && file.name || "";
  if (/^image\/gif$/i.test(type) || /\.gif$/i.test(name)) return true;
  if (bytes && isGifBytes(bytes)) return true;
  if (bytes && inspectImageBytes(bytes).animated) return true;
  if (/^image\/webp$/i.test(type) && bytes && inspectImageBytes(bytes).type === "webp" && inspectImageBytes(bytes).animated) return true;
  return false;
}
var MAX_GALLERY_ITEMS = 10;
var CAPTION_MAX = 200;
function gifFrameCount(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!isGifBytes(u8) || u8.length < 14) return 0;
  const gct = u8[10] & 128;
  const gctSize = gct ? 3 * 2 ** ((u8[10] & 7) + 1) : 0;
  let i = 13 + gctSize;
  let frames = 0;
  while (i < u8.length) {
    const b = u8[i];
    if (b === 59) break;
    if (b === 44) {
      if (i + 10 > u8.length) break;
      const lct = u8[i + 9] & 128;
      const lsz = lct ? 3 * 2 ** ((u8[i + 9] & 7) + 1) : 0;
      i = i + 10 + lsz;
      if (i >= u8.length) break;
      i += 1;
      while (i < u8.length && u8[i] !== 0) i += 1 + u8[i];
      i += 1;
      frames += 1;
      continue;
    }
    if (b === 33) {
      i += 2;
      while (i < u8.length && u8[i] !== 0) i += 1 + u8[i];
      i += 1;
      continue;
    }
    i += 1;
  }
  return frames;
}
function webpInfo(u8) {
  const out = { type: "webp", animated: false, frames: 0 };
  if (u8.length < 16) return out;
  let i = 12;
  while (i + 8 <= u8.length) {
    const tag = String.fromCharCode(u8[i], u8[i + 1], u8[i + 2], u8[i + 3]);
    const size = u8[i + 4] | u8[i + 5] << 8 | u8[i + 6] << 16 | u8[i + 7] << 24;
    if (tag === "VP8X" && i + 12 <= u8.length) {
      if (u8[i + 8] & 2) out.animated = true;
    }
    if (tag === "ANIM") out.animated = true;
    if (tag === "ANMF") {
      out.animated = true;
      out.frames += 1;
    }
    i += 8 + size + (size & 1);
  }
  return out;
}
function inspectImageBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : bytes ? new Uint8Array(bytes) : new Uint8Array();
  if (isGifBytes(u8)) {
    const frames = gifFrameCount(u8);
    return { type: "gif", animated: frames > 1, frames };
  }
  if (u8.length >= 16 && u8[0] === 82 && u8[1] === 73 && u8[2] === 70 && u8[3] === 70 && u8[8] === 87 && u8[9] === 69 && u8[10] === 66 && u8[11] === 80) {
    return webpInfo(u8);
  }
  if (u8.length >= 3 && u8[0] === 255 && u8[1] === 216 && u8[2] === 255) return { type: "jpeg", animated: false, frames: 1 };
  if (u8.length >= 8 && u8[0] === 137 && u8[1] === 80 && u8[2] === 78 && u8[3] === 71) return { type: "png", animated: false, frames: 1 };
  return { type: "unknown", animated: false, frames: 0 };
}
function normalizeExternalGifUrl(v) {
  try {
    const raw = String(v || "").trim();
    if (!raw) return "";
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    u.protocol = "https:";
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "giphy.com" || host.endsWith(".giphy.com")) {
      const media = /\/media\/(?:[^/]+\/)*([A-Za-z0-9]+)(?:\/|$)/.exec(u.pathname);
      const page = /\/gifs\/(?:[\w-]*-)?([A-Za-z0-9]+)\/?$/.exec(u.pathname);
      const id = media && media[1] || page && page[1];
      if (id) return "https://media.giphy.com/media/" + id + "/giphy.gif";
      if (/\.gif$/i.test(u.pathname)) {
        u.search = "";
        u.hash = "";
        return u.href;
      }
      return "";
    }
    if (host === "tenor.com" || host.endsWith(".tenor.com")) {
      if (/\.gif$/i.test(u.pathname)) {
        u.search = "";
        u.hash = "";
        return u.href;
      }
      return "";
    }
    return "";
  } catch {
    return "";
  }
}
var FLAT_GIF_HINT = "\u0421\u0435\u0440\u0432\u0435\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B \u0433\u0438\u0444\u043A\u0443 \u043A\u0430\u043A \u0441\u0442\u0430\u0442\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0434\u0440. \u0427\u0442\u043E\u0431\u044B \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u044F \u0442\u043E\u0447\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0430, \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0441 Giphy, Tenor \u0438\u043B\u0438 Imgur \u043D\u0430 \u0441\u0430\u043C \u0444\u0430\u0439\u043B .gif.";
function probeImageLoad(url, opts = {}) {
  const timeout = opts.timeout ?? 15e3;
  const Img = opts.Image || (typeof Image !== "undefined" ? Image : null);
  const href = safeUserImageUrl(url, opts);
  if (!href || href.startsWith("data:")) {
    if (href.startsWith("data:")) return Promise.resolve({ ok: true, width: 0, height: 0, url: href });
    return Promise.resolve({ ok: false, url: "" });
  }
  if (!Img) return Promise.resolve({ ok: false, url: href, code: "no-image" });
  return new Promise((resolve) => {
    const img = new Img();
    let done = false;
    const finish = (res) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      img.onload = img.onerror = null;
      resolve(res);
    };
    const t = setTimeout(() => finish({ ok: false, url: href, code: "timeout" }), timeout);
    img.onload = () => finish({ ok: true, width: img.naturalWidth || 0, height: img.naturalHeight || 0, url: href });
    img.onerror = () => finish({ ok: false, url: href, code: "error" });
    try {
      img.referrerPolicy = "no-referrer";
    } catch {
    }
    img.src = href;
  });
}
async function compressImage(source, opts = {}) {
  const maxEdge = opts.maxEdge ?? COMPRESS_MAX_EDGE;
  const quality = opts.quality ?? COMPRESS_QUALITY;
  const maxBytes = opts.maxBytes || 0;
  const doc = opts.document || (typeof document !== "undefined" ? document : null);
  if (!doc || typeof doc.createElement !== "function") throw new Error("compress requires a document");
  const img = await loadImage(source, doc, opts);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("bad image");
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  if (typeof img._revoke === "function") img._revoke();
  const tryType = (type2, q) => new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      try {
        const dataUrl2 = canvas.toDataURL(type2, q);
        resolve(dataUrl2 && dataUrl2.startsWith("data:") ? dataUrlToBlob(dataUrl2) : null);
      } catch {
        resolve(null);
      }
      return;
    }
    canvas.toBlob((b) => resolve(b), type2, q);
  });
  let type = "image/webp";
  let blob = await tryType(type, quality);
  if (!blob || !blob.size) {
    type = "image/jpeg";
    blob = await tryType(type, quality);
  }
  if (!blob) throw new Error("compress failed");
  if (maxBytes && blob.size > maxBytes) {
    for (const q of [0.7, 0.55, 0.4, 0.28]) {
      const smaller = await tryType(type, q);
      if (smaller && smaller.size <= maxBytes) {
        blob = smaller;
        break;
      }
      if (smaller && smaller.size < blob.size) blob = smaller;
    }
  }
  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl, width: w, height: h, type: blob.type || type };
}
function dataUrlToBlob(dataUrl) {
  const parsed = dataUrlToBytes(dataUrl);
  if (!parsed) return null;
  return new Blob([parsed.bytes], { type: parsed.type });
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });
}
function loadImage(source, doc, opts) {
  return new Promise((resolve, reject) => {
    const img = doc.createElement ? new (opts.Image || (typeof Image !== "undefined" ? Image : null) || function() {
    })() : null;
    if (!img) return reject(new Error("no Image"));
    const done = () => resolve(img);
    const fail = () => {
      if (typeof img._revoke === "function") img._revoke();
      reject(new Error("bad image"));
    };
    img.onload = done;
    img.onerror = fail;
    if (typeof source === "string") {
      img.src = source;
      return;
    }
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function" && (source instanceof Blob || typeof File !== "undefined" && source instanceof File)) {
      const obj = URL.createObjectURL(source);
      img._revoke = () => URL.revokeObjectURL(obj);
      img.src = obj;
      return;
    }
    reject(new Error("unsupported image source"));
  });
}
