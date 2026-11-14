(() => {
  // src/shared/gq-hash.js
  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  var URLISH = /^[(\[]?(?:[a-z][a-z0-9+.-]*:\/\/\S*|[\w-]+(?:\.[\w-]+)+(?:[/?#]\S*)?)[)\].,;:!?]*$/i;
  function fingerprintText(text) {
    const tokens = String(text || "").replace(/[\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]/g, "").toLowerCase().split(/\s+/).filter((t) => t && !URLISH.test(t));
    const letters = (tokens.join(" ").match(new RegExp("\\p{L}+", "gu")) || []).join("");
    return { len: letters.length, h: fnv1a(letters) };
  }

  // src/shared/gq-payload.js
  var PREFIX = "GQ1.";
  var MAX_COMPRESSED = 48 * 1024;
  var MAX_RAW = 400 * 1024;
  var te = new TextEncoder();
  var td = new TextDecoder("utf-8", { fatal: true });
  function toB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  var VS_RUN = /(?:[\uFE00-\uFE0F]|\uDB40[\uDD00-\uDDEF]){16,}/g;
  function vsExtract(text) {
    if (typeof text !== "string" || text.length < 16) return null;
    const runs = text.match(VS_RUN);
    if (!runs) return null;
    for (const run of runs.sort((a, b) => b.length - a.length)) {
      const out = [];
      for (const ch of run) {
        const cp = ch.codePointAt(0);
        if (cp >= 65024 && cp <= 65039) out.push(cp - 65024);
        else if (cp >= 917760 && cp <= 917999) out.push(cp - 917760 + 16);
      }
      if (out[0] === 71 && out[1] === 81) return Uint8Array.from(out);
    }
    return null;
  }
  function findTextCarriers(s) {
    if (typeof s !== "string") return [];
    return s.match(/GQ1\.[A-Za-z0-9_-]{8,}\.[0-9a-f]{8}/g) || [];
  }
  function carrierFromDelta(delta) {
    const ops = delta && Array.isArray(delta.ops) ? delta.ops : null;
    if (!ops) return null;
    for (let i = ops.length - 1; i >= 0; i--) {
      const a = ops[i] && ops[i].attributes;
      if (a && typeof a.gq === "string" && a.gq.startsWith(PREFIX)) return { kind: "attr", text: a.gq };
    }
    let all = "";
    for (const op of ops) if (op && typeof op.insert === "string") all += op.insert;
    const bytes = vsExtract(all);
    return bytes ? { kind: "vs", bytes } : null;
  }

  // src/shared/gq-image.js
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

  // src/content/gamequill/action-rewrite.js
  function collectSiteImages(ops) {
    const out = [];
    const seen2 = /* @__PURE__ */ new Set();
    for (const op of ops || []) {
      const emb = op && op.insert && typeof op.insert === "object" ? op.insert["custom-image"] : null;
      if (!emb || typeof emb !== "object") continue;
      const url = safeUserImageUrl(emb.url);
      if (!url || !url.startsWith("https:") || !isSiteImageUrl(url) || seen2.has(url)) continue;
      seen2.add(url);
      const width = Math.max(0, Math.min(2e4, Math.round(+emb.width || 0)));
      const height = Math.max(0, Math.min(2e4, Math.round(+emb.height || 0)));
      const id = panaxImageId(url);
      const row = { image_url: url, width, height };
      if (id) {
        let opts = {};
        try {
          const parsed = new URL(url);
          if (isPrivateHost(parsed.hostname)) opts = { origin: parsed.origin };
        } catch {
        }
        row.image_url = panaxInputUrl(id, opts) || url;
        row.large_image_url = panaxDerivativeUrl(id, "large", opts);
        row.medium_image_url = panaxDerivativeUrl(id, "medium", opts);
        row.small_image_url = panaxDerivativeUrl(id, "small", opts);
      }
      out.push(row);
    }
    return out;
  }
  var escFlight = (s) => typeof s === "string" && s[0] === "$" ? "$" + s : s;
  function unescFlight(s) {
    if (typeof s !== "string") return "";
    if (s === "$undefined") return "";
    if (s.startsWith("$$")) return s.slice(1);
    return s;
  }
  function findPostArg(args) {
    if (!Array.isArray(args)) return null;
    for (const a of args) {
      if (!a || typeof a !== "object" || Array.isArray(a) || !("content" in a)) continue;
      if ("delta_content" in a || "object_type" in a) return a;
    }
    return null;
  }
  function rewriteActionBody(bodyText, armed2, decide2 = () => true) {
    if (typeof bodyText !== "string" || bodyText.length > 5e6 || bodyText[0] !== "[") return null;
    if (!bodyText.includes("delta_content") && !bodyText.includes("object_type")) return null;
    let args;
    try {
      args = JSON.parse(bodyText);
    } catch {
      return null;
    }
    const obj = findPostArg(args);
    if (!obj) return null;
    const sent = unescFlight(obj.content);
    const a = fingerprintText(sent);
    const b = fingerprintText(armed2.plain);
    const changed = a.h !== b.h;
    if (!decide2({ changed, sentText: sent })) return { body: bodyText, changed, rewritten: false };
    obj.content = escFlight(String(armed2.plain || "").trim());
    obj.delta_content = escFlight(JSON.stringify({ ops: armed2.ops }));
    const extra = collectSiteImages(armed2.ops);
    if (extra.length) {
      const existing = Array.isArray(obj.images) ? obj.images.filter((x) => x && typeof x === "object") : [];
      const seen2 = new Set(existing.map((x) => x.image_url).filter(Boolean));
      const merged = existing.slice();
      for (const im of extra) {
        if (seen2.has(im.image_url)) continue;
        seen2.add(im.image_url);
        merged.push(im);
      }
      obj.images = merged;
    }
    return { body: JSON.stringify(args), changed, rewritten: true };
  }
  function toQuillOps(ops) {
    return (ops || []).map((op) => {
      if (!op.attributes) return { insert: op.insert };
      const a = { ...op.attributes };
      delete a.gq;
      if (typeof op.insert === "string" && op.insert !== "\n") delete a.header;
      return Object.keys(a).length ? { insert: op.insert, attributes: a } : { insert: op.insert };
    });
  }

  // src/content/gamequill/main-bridge.js
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
  var armed = null;
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
        const h = headers.find((x) => String(x[0]).toLowerCase() === name.toLowerCase());
        return h ? h[1] : null;
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
  function startGameQuillMain() {
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
    const start = () => {
      queueScan();
      new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
      setInterval(queueScan, 2e3);
    };
    if (document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  // src/content/main-world.js
  try {
    startGameQuillMain();
  } catch (e) {
    console.warn("[PANAX RU] GameQuill main bridge", e);
  }
})();
