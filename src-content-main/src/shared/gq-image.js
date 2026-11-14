var MAX_DATA_IMAGE = 40 * 1024;
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
var LOCAL_TARGET_BYTES = 28 * 1024;
var PANAX_IMAGE_CDN = "https://d21t60rno19oyf.cloudfront.net";
var PANAX_IMAGE_CDN_HOST = "d21t60rno19oyf.cloudfront.net";
var SITE_IMAGE_HOSTS = [
  "gamedb-oz.s3.amazonaws.com",
  "gamedb-oz.s3.ap-northeast-2.amazonaws.com",
  "gamedb-oz.s3.ap-southeast-1.amazonaws.com",
  "gamedb-oz.s3-accelerate.amazonaws.com",
  PANAX_IMAGE_CDN_HOST
];
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
function isSiteImageHost(host) {
  const h = String(host || "").toLowerCase();
  if (SITE_IMAGE_HOSTS.includes(h)) return true;
  if (/(^|\.)s3[.-]/.test(h) && h.includes("gamedb")) return true;
  return false;
}
function isSiteImageUrl(v) {
  try {
    const u = new URL(String(v || ""));
    if (u.protocol === "https:" && isSiteImageHost(u.hostname)) return true;
    if (isAllowedExtraOrigin(u) && (PANAX_INPUT_RE.test(u.pathname) || PANAX_DERIV_RE.test(u.pathname))) return true;
    return false;
  } catch {
    return false;
  }
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
function s3PutUrl(presigned, opts = {}) {
  const t = new URL(String(presigned || ""));
  if (t.protocol !== "https:" && t.protocol !== "http:") throw new Error("bad presign");
  if (isPrivateHost(t.hostname) || opts.pageOrigin && originsEqual(t, opts.pageOrigin)) {
    return t.origin + t.pathname + t.search;
  }
  return "https://gamedb-oz.s3.amazonaws.com" + t.pathname + t.search;
}
function originsEqual(u, origin) {
  try {
    const o = new URL(origin);
    return o.protocol === u.protocol && o.hostname === u.hostname && (o.port || defaultPort(o.protocol)) === (u.port || defaultPort(u.protocol));
  } catch {
    return false;
  }
}
function base64ToBytes(b64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(String(b64), "base64"));
  const bin = atob(String(b64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
function panaxImageId(v) {
  try {
    const u = new URL(String(v || "").trim());
    const input = PANAX_INPUT_RE.exec(u.pathname);
    if (input) return input[1].toLowerCase();
    const deriv = PANAX_DERIV_RE.exec(u.pathname);
    if (deriv) return deriv[2].toLowerCase();
    return "";
  } catch {
    return "";
  }
}
function panaxDerivativeUrl(id, size, opts = {}) {
  const uuid = String(id || "").toLowerCase();
  if (!new RegExp("^" + UUID_RE + "$").test(uuid)) return "";
  const kind = size === "medium" || size === "small" || size === "large" ? size : "large";
  const origin = opts.origin || PANAX_IMAGE_CDN;
  return origin + "/image/" + kind + "/" + uuid + ".webp";
}
function panaxInputUrl(id, opts = {}) {
  const uuid = String(id || "").toLowerCase();
  if (!new RegExp("^" + UUID_RE + "$").test(uuid)) return "";
  return (opts.origin || PANAX_IMAGE_CDN) + "/image/input/" + uuid;
}
var FLAT_GIF_HINT = "\u0421\u0435\u0440\u0432\u0435\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B \u0433\u0438\u0444\u043A\u0443 \u043A\u0430\u043A \u0441\u0442\u0430\u0442\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0434\u0440. \u0427\u0442\u043E\u0431\u044B \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u044F \u0442\u043E\u0447\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0430, \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0441 Giphy, Tenor \u0438\u043B\u0438 Imgur \u043D\u0430 \u0441\u0430\u043C \u0444\u0430\u0439\u043B .gif.";
var ANON_USER_TOKEN = "ad9739191285443a88dd2994ce7da73fbcf58f8d6525407989193eaebcca77d4";
async function uploadImageToPanax(p) {
  const fetchImpl = p.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  if (!fetchImpl) return { ok: false, code: "no-fetch", error: "fetch \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" };
  const bytes = p.bytes instanceof Uint8Array ? p.bytes : new Uint8Array(p.bytes || []);
  const contentType = isRasterImageType(p.contentType) ? p.contentType : "image/jpeg";
  const width = Math.max(0, Math.round(+p.width || 0));
  const height = Math.max(0, Math.round(+p.height || 0));
  if (!bytes.length) return { ok: false, code: "empty", error: "\u043F\u0443\u0441\u0442\u043E\u0439 \u0444\u0430\u0439\u043B" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, code: "too-large", error: "\u0444\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439" };
  const q = new URLSearchParams({
    file_type: "image",
    content_type: contentType,
    width: String(width || ""),
    height: String(height || "")
  });
  let presign;
  try {
    presign = await getJson(fetchImpl, "/community/upload-pre-signed-url?" + q.toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Anonymous-User-Token": ANON_USER_TOKEN
      }
    });
  } catch (e) {
    const code = e && e.status === 401 ? "auth" : e && e.code ? e.code : "presign";
    return { ok: false, code, error: e && e.message || "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", status: e && e.status };
  }
  const uploadUrl = presign && (presign.upload_pre_signed_url || presign.url);
  if (!uploadUrl) return { ok: false, code: "presign", error: "\u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" };
  let putTo;
  try {
    putTo = s3PutUrl(uploadUrl, { pageOrigin: p.pageOrigin });
  } catch (e) {
    return { ok: false, code: "presign", error: "\u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" };
  }
  const put = await fetchImpl(putTo, {
    method: "PUT",
    body: bytes,
    credentials: "omit",
    headers: {
      "Content-Type": contentType,
      "x-amz-meta-width": String(width || 0),
      "x-amz-meta-height": String(height || 0)
    }
  });
  if (!put.ok) return { ok: false, code: "put", error: "\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C (" + put.status + ")", status: put.status };
  const deadline = Date.now() + 3e4;
  let conv = null;
  let completed = false;
  while (Date.now() < deadline) {
    try {
      conv = await getJson(fetchImpl, "/community/check-image-convert?pre_signed_url=" + encodeURIComponent(uploadUrl), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Anonymous-User-Token": ANON_USER_TOKEN
        }
      });
      if (conv && conv.is_completed) {
        completed = true;
        break;
      }
      if (conv && (conv.status === "ERROR" || conv.status === "CANCELED")) {
        return { ok: false, code: "convert", error: "\u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u0441\u043C\u043E\u0433 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" };
      }
    } catch (e) {
      if (e && e.status === 401) return { ok: false, code: "auth", error: e.message || "\u043D\u0443\u0436\u0435\u043D \u0432\u0445\u043E\u0434 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435", status: 401 };
    }
    await sleep(1e3);
  }
  if (!completed) return { ok: false, code: "convert", error: "\u0441\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0432\u043E\u0432\u0440\u0435\u043C\u044F" };
  const candidates = [
    conv && (conv.image_url || conv.public_url || conv.url || conv.converted_url),
    uploadUrl
  ];
  let href = "";
  for (const c of candidates) {
    if (!c) continue;
    href = toPublicPanaxImageUrl(c, { pageOrigin: p.pageOrigin }) || safeUserImageUrl(c);
    if (href && !hasSignedQuery(href)) break;
    href = "";
  }
  if (!href) return { ok: false, code: "url", error: "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" };
  const wantAnim = shouldPreserveAnimation({ type: contentType }, bytes);
  const probeUntil = Date.now() + 12e3;
  let probed = null;
  while (Date.now() < probeUntil) {
    probed = await probeFetched(fetchImpl, href);
    if (probed) break;
    await sleep(800);
  }
  if (!probed) return { ok: false, code: "not-ready", error: "\u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u043A\u0430 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F", url: href };
  const picked = await pickAnimatedPublicUrl(fetchImpl, href, probed, { wantAnim, pageOrigin: p.pageOrigin });
  const out = {
    ok: true,
    url: picked.url,
    width,
    height,
    origin: "upload",
    probed: true,
    animated: !!picked.animated,
    kind: picked.kind || ""
  };
  if (wantAnim && !picked.animated) {
    out.warning = FLAT_GIF_HINT;
  }
  return out;
}
async function pickAnimatedPublicUrl(fetchImpl, href, firstProbe, opts = {}) {
  const wantAnim = !!opts.wantAnim;
  const list = [];
  const add = (u) => {
    const clean = toPublicPanaxImageUrl(u, { pageOrigin: opts.pageOrigin }) || safeUserImageUrl(u);
    if (clean && !hasSignedQuery(clean) && !list.includes(clean)) list.push(clean);
  };
  add(href);
  const id = panaxImageId(href);
  if (id) {
    const origin = new URL(href).origin;
    const local = isPrivateHost(new URL(href).hostname) || isAllowedExtraOrigin(new URL(href));
    const base = local ? { origin } : {};
    add(panaxInputUrl(id, base));
    add(panaxDerivativeUrl(id, "large", base));
    add(panaxDerivativeUrl(id, "medium", base));
  }
  let bestStill = href;
  let bestStillKind = firstProbe && firstProbe.info && firstProbe.info.type || "";
  for (let i = 0; i < list.length; i++) {
    const u = list[i];
    const probe = i === 0 && firstProbe && firstProbe.url === u ? firstProbe : await probeFetched(fetchImpl, u);
    if (!probe) continue;
    const info = probe.info || inspectImageBytes(probe.bytes || []);
    if (info.animated) return { url: u, animated: true, kind: info.type, frames: info.frames, contentType: probe.contentType };
    if (!bestStill) {
      bestStill = u;
      bestStillKind = info.type;
    }
    if (info.type === "gif" || info.type === "webp") {
      bestStill = u;
      bestStillKind = info.type;
    }
  }
  return { url: bestStill, animated: false, kind: bestStillKind };
}
async function probeFetched(fetchImpl, url) {
  try {
    const r = await fetchImpl(url, { method: "GET", credentials: "omit", headers: { Accept: "image/*,*/*" } });
    if (!r.ok) return null;
    const ct = r.headers && typeof r.headers.get === "function" && r.headers.get("content-type") || "";
    if (ct && !/^image\//i.test(ct) && !/^application\/octet-stream/i.test(ct)) return null;
    let buf = new Uint8Array();
    if (typeof r.arrayBuffer === "function") buf = new Uint8Array(await r.arrayBuffer());
    if (!buf.length) return null;
    return { url, contentType: ct, bytes: buf, info: inspectImageBytes(buf) };
  } catch {
    return null;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function getJson(fetchImpl, url, init) {
  const r = await fetchImpl(url, init);
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!r.ok) {
    const msg = data && (data.detail || data.error || data.message) || "HTTP " + r.status;
    const err = new Error(typeof msg === "string" ? msg : "HTTP " + r.status);
    err.status = r.status;
    err.code = r.status === 401 ? "auth" : "http";
    throw err;
  }
  if (data && data.success === false) {
    const err = new Error(data.error && data.error.message || data.detail || "request failed");
    err.code = "http";
    throw err;
  }
  if (data && data.success === true && data.data != null) return data.data;
  return data;
}
