(() => {
  // src/shared/gq-image.js
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

  // src/shared/gq-schema.js
  var LIMITS = {
    str: 300,
    longStr: 600,
    url: 2048,
    html: 2e4,
    blocks: 300,
    aspects: 30,
    pc: 40,
    arr: 20,
    mapKeys: 16
  };
  var TEXTY = ["text", "h2", "h3", "quote", "spoiler"];
  var WIDGETS = ["game", "steam", "youtube", "workshop", "image"];
  var BLOCK_TYPES = [...TEXTY, "divider", ...WIDGETS];
  var VERDICTS = ["yes", "neutral", "no", "none"];
  var IMAGE_HOSTS = [
    "cdn.akamai.steamstatic.com",
    "shared.akamai.steamstatic.com",
    "shared.fastly.steamstatic.com",
    "cdn.cloudflare.steamstatic.com",
    "shared.cloudflare.steamstatic.com",
    "steamcdn-a.akamaihd.net",
    "cdn.fastly.steamstatic.com",
    "store.akamai.steamstatic.com",
    "i.ytimg.com",
    "img.youtube.com",
    "images.igdb.com",
    "media.rawg.io"
  ];
  var DEFAULT_INTEG = {
    backloggd: { name: "Backloggd", icon: "\u{1F3AE}", color: "#4f8cff" },
    igdb: { name: "IGDB", icon: "\u{1F579}\uFE0F", color: "#9147ff" },
    steam: { name: "Steam Store", icon: "\u2668\uFE0F", color: "#66c0f4" },
    workshop: { name: "Steam Workshop", icon: "\u{1F6E0}\uFE0F", color: "#66c0f4" },
    youtube: { name: "YouTube", icon: "\u25B6\uFE0F", color: "#ff4d6d" },
    rawg: { name: "RAWG", icon: "\u{1F7E1}", color: "#f6c445" },
    metacritic: { name: "Metacritic", icon: "\u{1F4CA}", color: "#ffcc33" },
    hltb: { name: "HowLongToBeat", icon: "\u23F1\uFE0F", color: "#e05353" }
  };
  var isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  function str(v, max = LIMITS.str) {
    if (v === null || v === void 0) return "";
    if (typeof v === "number" && Number.isFinite(v)) v = String(v);
    if (typeof v !== "string") return "";
    let s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    s = s.replace(/\uDB40[\uDD00-\uDDEF]/g, "").replace(/[\uFE00-\uFE0F]{2,}/g, "");
    return s.length > max ? s.slice(0, max) : s;
  }
  function int(v, min, max, def = 0) {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.round(n)));
  }
  var encodeUnsafe2 = (href) => href.replace(/['"()\\\s<>`]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
  function safeUrl(v) {
    const s = str(v, LIMITS.url).trim();
    if (!s) return "";
    try {
      const u = new URL(s);
      if (u.protocol !== "https:" && u.protocol !== "http:") return "";
      if (u.username || u.password) return "";
      return encodeUnsafe2(u.href);
    } catch {
      return "";
    }
  }
  function safeImageUrl(v) {
    const href = safeUrl(v);
    if (!href) return "";
    try {
      const u = new URL(href);
      if (u.protocol !== "https:") return "";
      const host = u.hostname.toLowerCase();
      if (!IMAGE_HOSTS.includes(host)) return "";
      return encodeUnsafe2(u.href);
    } catch {
      return "";
    }
  }
  function safeColor(v) {
    const s = str(v, 40).trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(s)) return s;
    return "";
  }
  function strArr(v, max = LIMITS.arr, len = 60) {
    if (!Array.isArray(v)) return [];
    return v.slice(0, max).map((x) => str(x, len)).filter(Boolean);
  }
  function keyMap(v, valueFn) {
    const out = {};
    if (!isObj(v)) return out;
    let n = 0;
    for (const [k, val] of Object.entries(v)) {
      if (n >= LIMITS.mapKeys) break;
      if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(k)) continue;
      const nv = valueFn(val);
      if (nv === "" || nv === null || nv === void 0) continue;
      out[k] = nv;
      n++;
    }
    return out;
  }
  var ORIGIN_OK = (o, url) => o === "upload" || o === "local" || o === "url" ? o : String(url || "").startsWith("data:") ? "local" : "url";
  function normalizeImageItem(it) {
    if (!isObj(it)) return null;
    const url = safeUserImageUrl(it.url);
    if (!url) return null;
    const caption = str(it.caption, CAPTION_MAX).replace(/\s+/g, " ").trim();
    const alt = str(it.alt || caption, CAPTION_MAX).replace(/\s+/g, " ").trim();
    return {
      url,
      width: int(it.width, 0, 2e4, 0),
      height: int(it.height, 0, 2e4, 0),
      caption,
      alt,
      origin: ORIGIN_OK(it.origin, url)
    };
  }
  function normalizeImageData(d) {
    if (!isObj(d)) return { url: "", width: 0, height: 0, alt: "", origin: "url", caption: "", items: [] };
    const rawItems = Array.isArray(d.items) && d.items.length ? d.items : d.url ? [d] : [];
    const items = [];
    const seen = /* @__PURE__ */ new Set();
    for (const it of rawItems) {
      if (items.length >= MAX_GALLERY_ITEMS) break;
      const n = normalizeImageItem(it);
      if (!n || seen.has(n.url)) continue;
      seen.add(n.url);
      items.push(n);
    }
    const caption = str(d.caption, CAPTION_MAX).replace(/\s+/g, " ").trim();
    if (!items.length) return { url: "", width: 0, height: 0, alt: "", origin: "url", caption, items: [] };
    const first = items[0];
    return {
      url: first.url,
      width: first.width,
      height: first.height,
      alt: first.alt || caption,
      origin: first.origin,
      caption,
      items
    };
  }
  function widgetData(type, d) {
    d = isObj(d) ? d : {};
    if (type === "game") {
      return {
        gameId: str(d.gameId, 80),
        title: str(d.title, 200),
        year: str(d.year, 12),
        dev: str(d.dev, 120),
        pub: str(d.pub, 120),
        genres: strArr(d.genres, 8, 40),
        plat: strArr(d.plat, 8, 30),
        cover: safeImageUrl(d.cover),
        links: keyMap(d.links, safeUrl),
        ratings: keyMap(d.ratings, (x) => str(x, 16)),
        source: str(d.source, 40)
      };
    }
    if (type === "steam") {
      return {
        title: str(d.title, 200),
        app: str(d.app, 16).replace(/\D/g, ""),
        price: str(d.price, 40),
        old: str(d.old, 40),
        disc: str(d.disc, 12),
        date: str(d.date, 40),
        tags: strArr(d.tags, 8, 30),
        cover: safeImageUrl(d.cover),
        url: safeUrl(d.url)
      };
    }
    if (type === "youtube") {
      return {
        title: str(d.title, 200),
        channel: str(d.channel, 80),
        dur: str(d.dur, 12),
        url: safeUrl(d.url),
        cover: safeImageUrl(d.cover)
      };
    }
    if (type === "workshop") {
      return {
        title: str(d.title, 200),
        author: str(d.author, 80),
        subs: str(d.subs, 20),
        game: str(d.game, 120),
        url: safeUrl(d.url),
        cover: safeImageUrl(d.cover)
      };
    }
    if (type === "image") {
      return normalizeImageData(d);
    }
    return {};
  }
  function normalizeReview(input, opts = {}) {
    if (!isObj(input)) return null;
    const clean2 = typeof opts.sanitizeHtml === "function" ? opts.sanitizeHtml : (h) => h;
    const r = {
      v: 1,
      title: str(input.title, LIMITS.str),
      game: str(input.game, LIMITS.str),
      author: str(input.author, 80),
      score: int(input.score, 0, 10),
      recommend: VERDICTS.includes(input.recommend) ? input.recommend : "none",
      aspects: [],
      pros: [],
      cons: [],
      blocks: [],
      integ: {},
      fp: null,
      updatedAt: int(input.updatedAt, 0, 864e13, 0)
    };
    if (Array.isArray(input.aspects)) {
      for (const a of input.aspects.slice(0, LIMITS.aspects)) {
        if (!isObj(a)) continue;
        const name = str(a.name, 80).trim();
        if (!name) continue;
        r.aspects.push({ name, score: int(a.score, 0, 10), unrated: a.unrated === "na" ? "na" : "unsure" });
      }
    }
    for (const k of ["pros", "cons"]) {
      if (!Array.isArray(input[k])) continue;
      for (const p of input[k].slice(0, LIMITS.pc)) {
        const text = str(isObj(p) ? p.text : p, LIMITS.longStr).replace(/\s+/g, " ").trim();
        if (text) r[k].push({ text });
      }
    }
    if (Array.isArray(input.blocks)) {
      for (const b of input.blocks.slice(0, LIMITS.blocks)) {
        if (!isObj(b) || !BLOCK_TYPES.includes(b.type)) continue;
        const nb = { type: b.type };
        if (TEXTY.includes(b.type)) {
          nb.html = clean2(str(b.html, LIMITS.html));
          if (b.type === "spoiler") nb.hidden = b.hidden !== false;
        } else if (b.type === "divider") {
          nb.data = { style: int(isObj(b.data) ? b.data.style : 1, 1, 3, 1) };
        } else if (b.type === "image") {
          const data = widgetData(b.type, b.data);
          if (!data || !data.items || !data.items.length || !data.url) continue;
          nb.data = data;
        } else {
          nb.data = widgetData(b.type, b.data);
        }
        r.blocks.push(nb);
      }
    }
    if (isObj(input.integ)) {
      r.integ = keyMap(input.integ, (v) => {
        if (!isObj(v)) return null;
        const name = str(v.name, 40).trim();
        if (!name) return null;
        return { name, icon: str(v.icon, 8), color: safeColor(v.color) || "#7c5cff" };
      });
    }
    if (isObj(input.fp) && typeof input.fp.h === "string" && /^[0-9a-f]{8}$/.test(input.fp.h)) {
      r.fp = { len: int(input.fp.len, 0, 1e7), h: input.fp.h };
    }
    return r;
  }
  function integMeta(review, key) {
    return review && review.integ && review.integ[key] || DEFAULT_INTEG[key] || { name: key, icon: "\u{1F517}", color: "#7c5cff" };
  }
  function hasContent(r) {
    if (!r) return false;
    return !!(r.title.trim() || r.score || r.blocks.length || r.pros.length || r.cons.length || r.aspects.some((a) => a.score > 0));
  }

  // src/shared/gq-demo.js
  var DEMO_CONFIRM = "\u0412 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u043C \u043E\u0431\u0437\u043E\u0440\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0442\u0435\u043A\u0441\u0442. \u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u0435\u0433\u043E \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u043C \u043E\u0431\u0437\u043E\u0440\u043E\u043C \xAB\u041D\u0435\u043E\u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u0432\u0438\u0435\u043C \u043F\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u0447\u0435\u0441\u0442\u0432\u0443\xBB? \u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0431\u0443\u0434\u0435\u0442 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u043E.";
  var DEMO_GAME = {
    id: "neon-requiem",
    title: "Neon Requiem",
    year: 2025,
    dev: "Voidline Studio",
    pub: "Nova Interactive",
    genres: ["Action RPG", "\u041A\u0438\u0431\u0435\u0440\u043F\u0430\u043D\u043A", "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u043C\u0438\u0440"],
    plat: ["PC", "PS5", "Xbox Series"],
    pal: ["#ff2fb3", "#12062b", "#22d3ee"],
    r: { backloggd: 8.4, igdb: 82, metacritic: 86, hltb: "38 \u0447." },
    links: {
      backloggd: "https://www.backloggd.com/games/neon-requiem/",
      igdb: "https://www.igdb.com/games/neon-requiem",
      steam: "https://store.steampowered.com/app/2448510/Neon_Requiem/",
      rawg: "https://rawg.io/games/neon-requiem",
      metacritic: "https://www.metacritic.com/game/neon-requiem",
      hltb: "https://howlongtobeat.com/game?id=118402"
    },
    steam: { app: 2448510, price: "1 999 \u20BD", old: "2 499 \u20BD", disc: "-20%", date: "14 \u043C\u0430\u0440. 2025", tags: ["\u042D\u043A\u0448\u0435\u043D", "RPG", "\u041A\u0438\u0431\u0435\u0440\u043F\u0430\u043D\u043A", "\u0421\u044E\u0436\u0435\u0442"] },
    trailer: { t: "Neon Requiem \u2014 \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0442\u0440\u0435\u0439\u043B\u0435\u0440 \u0437\u0430\u043F\u0443\u0441\u043A\u0430", ch: "Voidline Studio", dur: "2:14", url: "https://www.youtube.com/watch?v=neonrequiem-trailer" },
    ws: [
      { t: "Neon Requiem: \u0424\u043E\u0442\u043E\u0440\u0435\u0436\u0438\u043C Deluxe", a: "KiraMods", s: "12 480" },
      { t: "\u041A\u043E\u0441\u0442\u044E\u043C \xAB\u041D\u0435\u043E\u043D\u043E\u0432\u044B\u0439 \u0441\u0430\u043C\u0443\u0440\u0430\u0439\xBB", a: "Rin_Art", s: "5 213" }
    ]
  };
  var seq = 0;
  var defaultUid = () => "demo-" + ++seq + "-" + Math.random().toString(36).slice(2, 8);
  function makeDemoReview(opts = {}) {
    const uid2 = opts.uid || defaultUid;
    const g = opts.game || DEMO_GAME;
    const cover = opts.cover || g.cover || "";
    const gameData = {
      gameId: g.id,
      title: g.title,
      year: g.year,
      dev: g.dev,
      pub: g.pub,
      genres: g.genres.slice(),
      plat: g.plat.slice(),
      cover,
      links: {
        backloggd: g.links.backloggd,
        igdb: g.links.igdb,
        steam: g.links.steam,
        rawg: g.links.rawg
      },
      ratings: { backloggd: g.r.backloggd, igdb: g.r.igdb },
      source: "Backloggd"
    };
    const steamData = {
      title: g.title,
      app: String(g.steam.app),
      price: g.steam.price,
      old: g.steam.old,
      disc: g.steam.disc,
      date: g.steam.date,
      tags: g.steam.tags.slice(),
      cover,
      url: g.links.steam
    };
    const ytData = {
      title: g.trailer.t,
      channel: g.trailer.ch,
      dur: g.trailer.dur,
      url: g.trailer.url,
      cover
    };
    return {
      title: "\u041D\u0435\u043E\u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u0432\u0438\u0435\u043C \u043F\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u0447\u0435\u0441\u0442\u0432\u0443",
      game: g.title,
      score: 8,
      recommend: "yes",
      aspects: [
        { id: uid2(), name: "\u0421\u044E\u0436\u0435\u0442", score: 9, unrated: "unsure" },
        { id: uid2(), name: "\u0413\u0440\u0430\u0444\u0438\u043A\u0430", score: 10, unrated: "unsure" },
        { id: uid2(), name: "\u0413\u0435\u0439\u043C\u043F\u043B\u0435\u0439", score: 8, unrated: "unsure" },
        { id: uid2(), name: "\u041E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F", score: 0, unrated: "unsure" },
        { id: uid2(), name: "\u041B\u043E\u043A\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F", score: 7, unrated: "unsure" },
        { id: uid2(), name: "\u0420\u0435\u0438\u0433\u0440\u0430\u0431\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", score: 0, unrated: "na" }
      ],
      blocks: [
        { id: uid2(), type: "game", data: gameData },
        { id: uid2(), type: "text", html: "<b>Neon Requiem</b> \u2014 \u044D\u0442\u043E \u0442\u043E\u0442 \u0440\u0435\u0434\u043A\u0438\u0439 \u0441\u043B\u0443\u0447\u0430\u0439, \u043A\u043E\u0433\u0434\u0430 \u044D\u043A\u0448\u0435\u043D \u043E\u0442 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u043B\u0438\u0446\u0430 \u043D\u0435 \u043F\u044B\u0442\u0430\u0435\u0442\u0441\u044F \u0431\u044B\u0442\u044C \u0432\u0441\u0435\u043C \u0441\u0440\u0430\u0437\u0443. \u041F\u0435\u0440\u0432\u044B\u0435 \u0434\u0432\u0430 \u0447\u0430\u0441\u0430 \u0438\u0433\u0440\u0430 \u0431\u0443\u043A\u0432\u0430\u043B\u044C\u043D\u043E <mark>\u0431\u0435\u0440\u0451\u0442 \u0432\u0430\u0441 \u0437\u0430 \u0448\u043A\u0438\u0440\u043A\u0443</mark> \u0438 \u0442\u0430\u0449\u0438\u0442 \u0441\u043A\u0432\u043E\u0437\u044C \u043D\u0435\u043E\u043D\u043E\u0432\u044B\u0435 \u0442\u0440\u0443\u0449\u043E\u0431\u044B, \u043D\u0435 \u0434\u0430\u0432\u0430\u044F \u043D\u0438 \u0441\u0435\u043A\u0443\u043D\u0434\u044B \u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u044B\u0448\u043A\u0443." },
        { id: uid2(), type: "h2", html: "\u0421\u044E\u0436\u0435\u0442 \u0431\u0435\u0437 \u0441\u043F\u043E\u0439\u043B\u0435\u0440\u043E\u0432" },
        { id: uid2(), type: "text", html: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0430\u0451\u043C\u043D\u0438\u0446\u044B \u0412\u0435\u043A\u0441\u044B \u043F\u043E\u0434\u0430\u043D\u0430 \u0447\u0435\u0440\u0435\u0437 <u>\u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0431\u0440\u0438\u0444\u0438\u043D\u0433\u0438</u> \u0438 \u0434\u0438\u0430\u043B\u043E\u0433\u0438 \u0432 \u043F\u0443\u0442\u0438 \u2014 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0440\u043E\u043B\u0438\u043A\u0430 \u0434\u043E\u043B\u044C\u0448\u0435 \u0434\u0432\u0443\u0445 \u043C\u0438\u043D\u0443\u0442. \u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0434\u0435\u0440\u0436\u0438\u0442 \u0438\u043D\u0442\u0440\u0438\u0433\u0443 \u0434\u043E \u0444\u0438\u043D\u0430\u043B\u0430, \u0430 \u0444\u0438\u043D\u0430\u043B, \u043A \u0441\u043B\u043E\u0432\u0443, <i>\u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0442\u0440\u0451\u0445 \u0432\u0430\u0448\u0438\u0445 \u0440\u0435\u0448\u0435\u043D\u0438\u0439</i>." },
        { id: uid2(), type: "quote", html: "\xAB\u0413\u043E\u0440\u043E\u0434 \u043D\u0435 \u0441\u043F\u0430\u0441\u0430\u044E\u0442. \u0412 \u043D\u0451\u043C \u043F\u0440\u043E\u0441\u0442\u043E \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442, \u043A\u0442\u043E \u0432\u044B\u0436\u0438\u0432\u0435\u0442.\xBB \u2014 \u0412\u0435\u043A\u0441\u0430, \u0442\u0440\u0435\u0442\u0438\u0439 \u0430\u043A\u0442" },
        { id: uid2(), type: "h3", html: "\u0413\u0435\u0439\u043C\u043F\u043B\u0435\u0439 \u0438 \u0438\u043C\u043F\u043B\u0430\u043D\u0442\u044B" },
        { id: uid2(), type: "text", html: "\u0411\u043E\u0435\u0432\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0441\u0442\u0440\u043E\u0438\u0442\u0441\u044F \u0432\u043E\u043A\u0440\u0443\u0433 <code>\u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u043C\u043F\u043B\u0430\u043D\u0442\u043E\u0432</code> \u043D\u0430 \u043B\u0435\u0442\u0443: \u0440\u044B\u0432\u043E\u043A, \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u0438, \u0432\u0437\u043B\u043E\u043C \u0442\u0443\u0440\u0435\u043B\u0435\u0439. \u041A\u043E\u043C\u0431\u043E \u0441\u043E\u0431\u0438\u0440\u0430\u044E\u0442\u0441\u044F \u0438\u043D\u0442\u0443\u0438\u0442\u0438\u0432\u043D\u043E, \u0430 \u0441\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C \u0447\u0435\u0441\u0442\u043D\u043E \u0440\u0430\u0441\u0442\u0451\u0442." },
        { id: uid2(), type: "spoiler", html: "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0432\u043E\u0440\u043E\u0442 \u0441 \u0434\u0432\u043E\u0439\u043D\u0438\u043A\u043E\u043C \u0412\u0435\u043A\u0441\u044B \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u043C\u0435\u043D\u044F\u0435\u0442 \u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044E \u0430\u043D\u0442\u0430\u0433\u043E\u043D\u0438\u0441\u0442\u0430 \u2014 \u0438 \u0438\u043C\u0435\u043D\u043D\u043E \u0437\u0430 \u044D\u0442\u043E \u0438\u0433\u0440\u0435 \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0441\u0442\u0438\u0442\u044C \u0441\u043B\u0430\u0431\u044B\u0439 \u0442\u0440\u0435\u0442\u0438\u0439 \u0430\u043A\u0442.", hidden: true },
        { id: uid2(), type: "divider", data: { style: 1 } },
        { id: uid2(), type: "youtube", data: ytData },
        { id: uid2(), type: "h2", html: "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0447\u0430\u0441\u0442\u044C" },
        { id: uid2(), type: "steam", data: steamData },
        { id: uid2(), type: "text", html: "\u041D\u0430 \u0440\u0435\u043B\u0438\u0437\u0435 \u0438\u0433\u0440\u0430 <s>\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0430 \u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E</s> \u043F\u0440\u043E\u0441\u0435\u0434\u0430\u043B\u0430 \u0434\u043E 45 FPS \u0432 \u0446\u0435\u043D\u0442\u0440\u0435 \u0433\u043E\u0440\u043E\u0434\u0430, \u043D\u043E \u043F\u0430\u0442\u0447 1.0.3 \u043F\u043E\u0447\u0442\u0438 \u0432\u0441\u0451 \u043F\u043E\u0447\u0438\u043D\u0438\u043B. \u041F\u043E\u043B\u043D\u043E\u0435 \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u0437\u0430\u043D\u044F\u043B\u043E \u0443 \u043C\u0435\u043D\u044F <b>34 \u0447\u0430\u0441\u0430</b>." },
        { id: uid2(), type: "workshop", data: { title: g.ws[0].t, author: g.ws[0].a, subs: g.ws[0].s, game: g.title, url: "https://steamcommunity.com/sharedfiles/filedetails/?id=299411220", cover } },
        { id: uid2(), type: "h2", html: "\u0418\u0442\u043E\u0433" },
        { id: uid2(), type: "text", html: 'Neon Requiem \u2014 \u043B\u0443\u0447\u0448\u0438\u0439 \u043A\u0438\u0431\u0435\u0440\u043F\u0430\u043D\u043A-\u044D\u043A\u0448\u0435\u043D \u0441\u043E \u0432\u0440\u0435\u043C\u0451\u043D \u0436\u0430\u043D\u0440\u043E\u0432\u043E\u0433\u043E \u0440\u0435\u043D\u0435\u0441\u0441\u0430\u043D\u0441\u0430. \u0411\u0435\u0440\u0438\u0442\u0435, \u0435\u0441\u043B\u0438 \u043B\u044E\u0431\u0438\u0442\u0435 <a class="lnk" href="https://www.backloggd.com/games/neon-requiem/" target="_blank" rel="noopener">\u0441\u044E\u0436\u0435\u0442\u043D\u044B\u0435 \u043F\u0435\u0441\u043E\u0447\u043D\u0438\u0446\u044B</a> \u0438 \u0433\u043E\u0442\u043E\u0432\u044B \u043F\u0440\u043E\u0441\u0442\u0438\u0442\u044C \u043C\u0435\u043B\u043A\u0438\u0435 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0435\u0445\u0438 \u0440\u0430\u0434\u0438 \u043F\u043E\u0442\u0440\u044F\u0441\u0430\u044E\u0449\u0435\u0439 \u0430\u0442\u043C\u043E\u0441\u0444\u0435\u0440\u044B.' }
      ],
      pros: [
        { id: uid2(), text: "\u041D\u0435\u0432\u0435\u0440\u043E\u044F\u0442\u043D\u044B\u0439 \u0430\u0440\u0442-\u0434\u0438\u0437\u0430\u0439\u043D \u0438 \u0440\u0430\u0431\u043E\u0442\u0430 \u0441\u043E \u0441\u0432\u0435\u0442\u043E\u043C" },
        { id: uid2(), text: "\u0411\u043E\u0435\u0432\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0441 \u0438\u043C\u043F\u043B\u0430\u043D\u0442\u0430\u043C\u0438 \u2014 \u043B\u0443\u0447\u0448\u0430\u044F \u0432 \u0436\u0430\u043D\u0440\u0435" },
        { id: uid2(), text: "\u0416\u0438\u0432\u043E\u0439 \u0433\u043E\u0440\u043E\u0434, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0440\u0435\u0430\u0433\u0438\u0440\u0443\u0435\u0442 \u043D\u0430 \u0432\u0430\u0448\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" },
        { id: uid2(), text: "\u041F\u043E\u043B\u043D\u0430\u044F \u0440\u0443\u0441\u0441\u043A\u0430\u044F \u043B\u043E\u043A\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0441 \u043E\u0442\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0437\u0432\u0443\u0447\u043A\u043E\u0439" }
      ],
      cons: [
        { id: uid2(), text: "\u041F\u0440\u043E\u0441\u0430\u0434\u043A\u0438 FPS \u0432 \u0446\u0435\u043D\u0442\u0440\u0435 \u041D\u0435\u043E-\u041A\u0438\u043E\u0442\u043E \u043D\u0430 \u0440\u0435\u043B\u0438\u0437\u0435" },
        { id: uid2(), text: "\u0421\u043B\u0430\u0431\u044B\u0439 \u0442\u0440\u0435\u0442\u0438\u0439 \u0430\u043A\u0442 \u0438 \u0441\u043A\u043E\u043C\u043A\u0430\u043D\u043D\u044B\u0439 \u0444\u0438\u043D\u0430\u043B \u043F\u043E\u0431\u043E\u0447\u0435\u043A" },
        { id: uid2(), text: "\u041D\u0435\u0442 \u0444\u043E\u0442\u043E\u0440\u0435\u0436\u0438\u043C\u0430 \u0438\u0437 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u043E\u0434 \u0432 \u041C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u043E\u0439" }
      ]
    };
  }
  function applyDemoReview(target, opts = {}) {
    const demo = makeDemoReview(opts);
    const id = target && target.id;
    const createdAt = target && target.createdAt;
    const panaxPostId = target && target.panaxPostId;
    Object.assign(target, demo);
    if (id) target.id = id;
    if (createdAt) target.createdAt = createdAt;
    if (panaxPostId) target.panaxPostId = panaxPostId;
    target.updatedAt = Date.now();
    return target;
  }

  // src/shared/gq-html.js
  var INLINE_OK = /* @__PURE__ */ new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "CODE", "MARK", "A", "BR", "SPAN", "FONT", "SUB", "SUP"]);
  var BLOCK_OK = /* @__PURE__ */ new Set(["P", "DIV", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
  var DROP_WITH_CONTENT = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "NOSCRIPT", "TEXTAREA", "SELECT", "TITLE", "HEAD"]);
  var FONT_SIZES = { "1": "0.8em", "2": "0.85em", "3": "", "4": "1.1em", "5": "1.2em", "6": "1.4em", "7": "1.6em" };
  var OK_FONT_SIZES = /* @__PURE__ */ new Set(["0.8em", "0.85em", "1.1em", "1.2em", "1.4em", "1.6em"]);
  function parseHtml(html, win) {
    const P = win && win.DOMParser || (typeof DOMParser !== "undefined" ? DOMParser : null);
    if (!P) throw new Error("DOMParser unavailable");
    const d = new P().parseFromString("<!doctype html><body>" + String(html || ""), "text/html");
    return d.body;
  }
  function safeInlineStyle(styleText) {
    const out = {};
    String(styleText || "").split(";").forEach((decl) => {
      const i = decl.indexOf(":");
      if (i < 0) return;
      const prop = decl.slice(0, i).trim().toLowerCase();
      const val = decl.slice(i + 1).trim();
      if (prop === "color") {
        const c = safeColor(val);
        if (c) out.color = c;
      } else if (prop === "background-color" || prop === "background") {
        const c = safeColor(val);
        if (c) out["background-color"] = c;
      } else if (prop === "font-size" && OK_FONT_SIZES.has(val)) {
        out["font-size"] = val;
      } else if (prop === "font-weight" && /^(bold|[5-9]00)$/.test(val)) {
        out["font-weight"] = "bold";
      }
    });
    return out;
  }
  function styleString(obj) {
    return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(";");
  }
  function rebuild(src, dst, doc, depth = 0) {
    if (depth > 24) return;
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType === 3) {
        dst.appendChild(doc.createTextNode(n.nodeValue));
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toUpperCase();
      if (DROP_WITH_CONTENT.has(tag)) continue;
      if (!INLINE_OK.has(tag) && !BLOCK_OK.has(tag)) {
        rebuild(n, dst, doc, depth + 1);
        continue;
      }
      let el;
      if (tag === "FONT") {
        el = doc.createElement("span");
        const st = {};
        const c = safeColor(n.getAttribute("color"));
        if (c) st.color = c;
        const fs = FONT_SIZES[String(n.getAttribute("size") || "").trim()];
        if (fs) st["font-size"] = fs;
        Object.assign(st, safeInlineStyle(n.getAttribute("style")));
        if (Object.keys(st).length) el.setAttribute("style", styleString(st));
      } else if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
        el = doc.createElement("div");
        const b = doc.createElement("b");
        el.appendChild(b);
        rebuild(n, b, doc, depth + 1);
        dst.appendChild(el);
        continue;
      } else {
        el = doc.createElement(tag.toLowerCase());
        if (tag === "A") {
          const href = safeUrl(n.getAttribute("href"));
          if (href) {
            el.setAttribute("href", href);
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener noreferrer nofollow ugc");
          }
          const cls = String(n.getAttribute("class") || "");
          if (/\bgame-chip\b/.test(cls)) el.setAttribute("class", "game-chip");
          else if (/\blnk\b/.test(cls)) el.setAttribute("class", "lnk");
        } else if (tag === "SPAN") {
          const st = safeInlineStyle(n.getAttribute("style"));
          if (Object.keys(st).length) el.setAttribute("style", styleString(st));
        }
      }
      rebuild(n, el, doc, depth + 1);
      dst.appendChild(el);
    }
  }
  function sanitizeHtml(html, win) {
    const body = parseHtml(html, win);
    const doc = body.ownerDocument;
    const holder = doc.createElement("div");
    rebuild(body, holder, doc);
    return holder.innerHTML;
  }
  function parseForWalk(html, win) {
    return parseHtml(html, win);
  }

  // src/shared/gq-hash.js
  var CRC_TABLE = null;
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        CRC_TABLE[n] = c >>> 0;
      }
    }
    let crc = 4294967295;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 255] ^ crc >>> 8;
    return (crc ^ 4294967295) >>> 0;
  }
  function fnv1a(str2) {
    let h = 2166136261;
    for (let i = 0; i < str2.length; i++) {
      h ^= str2.charCodeAt(i);
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

  // src/shared/gq-fallback.js
  var SCORES = [
    null,
    { i: "\u{1F4A9}", t: "\u041F\u0440\u043E\u0432\u0430\u043B", d: "\u041D\u0435 \u0438\u0433\u0440\u0430\u0439\u0442\u0435 \u043D\u0438 \u043F\u0440\u0438 \u043A\u0430\u043A\u0438\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445" },
    { i: "\u{1F922}", t: "\u0423\u0436\u0430\u0441\u043D\u043E", d: "\u0421\u043B\u043E\u043C\u0430\u043D\u043E, \u0441\u043A\u0443\u0447\u043D\u043E, \u0431\u0435\u0437\u043D\u0430\u0434\u0435\u0436\u043D\u043E" },
    { i: "\u{1F616}", t: "\u041F\u043B\u043E\u0445\u043E", d: "\u041C\u0438\u043D\u0443\u0441\u043E\u0432 \u0441\u0438\u043B\u044C\u043D\u043E \u0431\u043E\u043B\u044C\u0448\u0435, \u0447\u0435\u043C \u043F\u043B\u044E\u0441\u043E\u0432" },
    { i: "\u{1F615}", t: "\u0421\u043B\u0430\u0431\u043E", d: "\u041D\u0438\u0436\u0435 \u0441\u0440\u0435\u0434\u043D\u0435\u0433\u043E \u2014 \u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C" },
    { i: "\u{1F610}", t: "\u0421\u0440\u0435\u0434\u043D\u0435", d: "\u041F\u0440\u043E\u0445\u043E\u0434\u043D\u044F\u043A \u043D\u0430 \u043E\u0434\u0438\u043D \u0432\u0435\u0447\u0435\u0440" },
    { i: "\u{1F642}", t: "\u041D\u0435\u043F\u043B\u043E\u0445\u043E", d: "\u0415\u0441\u0442\u044C \u0437\u0430 \u0447\u0442\u043E \u043F\u043E\u0445\u0432\u0430\u043B\u0438\u0442\u044C \u0438 \u043F\u043E\u0440\u0443\u0433\u0430\u0442\u044C" },
    { i: "\u{1F60A}", t: "\u0425\u043E\u0440\u043E\u0448\u043E", d: "\u041A\u0440\u0435\u043F\u043A\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430, \u0441\u0442\u043E\u0438\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F" },
    { i: "\u{1F60D}", t: "\u041E\u0442\u043B\u0438\u0447\u043D\u043E", d: "\u041E\u0434\u0438\u043D \u0438\u0437 \u043B\u0443\u0447\u0448\u0438\u0445 \u0440\u0435\u043B\u0438\u0437\u043E\u0432 \u0436\u0430\u043D\u0440\u0430" },
    { i: "\u{1F929}", t: "\u0412\u0435\u043B\u0438\u043A\u043E\u043B\u0435\u043F\u043D\u043E", d: "\u041F\u043E\u0447\u0442\u0438 \u0438\u0434\u0435\u0430\u043B, \u043C\u0435\u043B\u043A\u0438\u0435 \u043E\u0433\u0440\u0435\u0445\u0438" },
    { i: "\u{1F451}", t: "\u0428\u0435\u0434\u0435\u0432\u0440", d: "\u042D\u0442\u0430\u043B\u043E\u043D, \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D \u043A \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044E" }
  ];
  var VERDICT = {
    yes: { e: "\u{1F44D}", t: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E", c: "#3ddc97" },
    neutral: { e: "\u{1F914}", t: "\u041D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u043E", c: "#ffc84a" },
    no: { e: "\u{1F44E}", t: "\u041D\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E", c: "#ff5f6d" },
    none: { e: "\u2754", t: "\u0412\u0435\u0440\u0434\u0438\u043A\u0442 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D", c: "" }
  };
  var UNRATED = { unsure: "\u0430\u0432\u0442\u043E\u0440 \u043D\u0435 \u0443\u0432\u0435\u0440\u0435\u043D \u0432 \u043E\u0446\u0435\u043D\u043A\u0435", na: "\u043D\u0435 \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u043C\u043E \u043A \u044D\u0442\u043E\u0439 \u0438\u0433\u0440\u0435" };
  var FOOTER_TEXT = "\u2726 \u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u043E \u0432 GameQuill";
  var C = {
    gold: "#ffc84a",
    dim: "#8b94aa",
    quote: "#c9b8ff",
    green: "#3ddc97",
    red: "#ff5f6d",
    cyan: "#22d3ee",
    codeFg: "#7ce7d4",
    codeBg: "#0b0e16",
    mark: "#5a4a1c",
    spoiler: "#2a2a2a"
  };
  function cleanAttrs(a) {
    const o = {};
    for (const [k, v] of Object.entries(a || {})) if (v !== void 0 && v !== null && v !== false && v !== "") o[k] = v;
    return Object.keys(o).length ? o : null;
  }
  var sameAttrs = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
  var OpsBuilder = class {
    constructor() {
      this.ops = [];
      this.plain = "";
      this.lineOpen = false;
      this.blankPending = false;
    }
    _push(insert, attrs) {
      attrs = cleanAttrs(attrs);
      const last = this.ops[this.ops.length - 1];
      if (last && typeof last.insert === "string" && insert !== "\n" && last.insert !== "\n" && !last.insert.endsWith("\n") && sameAttrs(last.attributes, attrs)) {
        last.insert += insert;
        return;
      }
      const op = { insert };
      if (attrs) op.attributes = attrs;
      this.ops.push(op);
    }
    _flushBlank() {
      if (this.blankPending) {
        this.blankPending = false;
        this._push("\n");
        this.plain += "\n";
      }
    }
    text(s, attrs) {
      s = String(s || "").replace(/\r/g, "");
      if (!s) return;
      const parts = s.split("\n");
      parts.forEach((p, i) => {
        if (i > 0) this.newline();
        if (!p) return;
        if (!this.lineOpen) {
          this._flushBlank();
          p = p.replace(/^[ \t]+/, "");
          if (!p) return;
        } else if (/[ \t]$/.test(this.plain)) {
          p = p.replace(/^[ \t]+/, "");
          if (!p) return;
        }
        this._push(p, attrs);
        this.plain += p;
        this.lineOpen = true;
      });
    }
    newline(attrs) {
      this._flushBlank();
      this._push("\n", attrs);
      this.plain = this.plain.replace(/[ \t]+$/, "") + "\n";
      this.lineOpen = false;
    }
    endLine() {
      if (this.lineOpen) this.newline();
    }
    /** Quill embed (e.g. { 'custom-image': { url, width, height } }). */
    embed(obj) {
      if (!obj || typeof obj !== "object") return;
      this.endLine();
      this._flushBlank();
      this.ops.push({ insert: obj });
      this._push("\n");
      this.plain += "\n";
      this.lineOpen = false;
    }
    /** visual gap between blocks (one empty line) */
    gap() {
      this.endLine();
      if (this.ops.length) this.blankPending = true;
    }
    heading(text, level) {
      const t = String(text || "").replace(/\s+/g, " ").trim();
      if (!t) return;
      this.endLine();
      this._flushBlank();
      this.ops.push({ insert: t, attributes: { header: level } });
      this.ops.push({ insert: "\n", attributes: { header: level } });
      this.plain += t + "\n";
      this.lineOpen = false;
    }
    listItem(runs, listType = "bullet") {
      this.endLine();
      this._flushBlank();
      let any = false;
      for (const r of runs) {
        const t = String(r.text || "").replace(/\n+/g, " ");
        if (!t) continue;
        this._push(t, r.attrs);
        this.plain += t;
        any = true;
      }
      if (!any) {
        this._push(" ");
        this.plain += " ";
      }
      this.ops.push({ insert: "\n", attributes: { list: listType } });
      this.plain += "\n";
      this.lineOpen = false;
    }
  };
  var BLOCKY = /* @__PURE__ */ new Set(["P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
  function styleAttrs(el) {
    const st = safeInlineStyle(el.getAttribute && el.getAttribute("style"));
    const a = {};
    if (st.color) a.color = st.color;
    if (st["background-color"]) a.background = st["background-color"];
    if (st["font-weight"]) a.bold = true;
    if (st["font-size"]) {
      const n = parseFloat(st["font-size"]);
      if (n >= 1.2) a.size = "large";
      else if (n < 1) a.size = "small";
    }
    return a;
  }
  function emitInlineHtml(b, html, base = {}, win) {
    const body = parseForWalk(html, win);
    const walk = (node, attrs) => {
      for (const n of Array.from(node.childNodes)) {
        if (n.nodeType === 3) {
          const t = n.nodeValue.replace(/\u00a0/g, " ").replace(/[ \t\r\n]+/g, " ");
          if (t) b.text(t, attrs);
          continue;
        }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName.toUpperCase();
        if (["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "SVG", "NOSCRIPT"].includes(tag)) continue;
        if (tag === "BR") {
          b.newline();
          continue;
        }
        if (tag === "UL" || tag === "OL") {
          let k = 0;
          for (const li of Array.from(n.children)) {
            if (li.tagName !== "LI") continue;
            k++;
            b.endLine();
            b.text(tag === "OL" ? k + ". " : "\u2022 ", attrs);
            walk(li, attrs);
            b.endLine();
          }
          continue;
        }
        let a = { ...attrs };
        if (tag === "B" || tag === "STRONG") a.bold = true;
        else if (tag === "I" || tag === "EM") a.italic = true;
        else if (tag === "U") a.underline = true;
        else if (tag === "S" || tag === "STRIKE" || tag === "DEL") a.strike = true;
        else if (tag === "MARK") {
          a.background = C.mark;
          a.color = "#ffffff";
        } else if (tag === "CODE") {
          a.color = C.codeFg;
          a.background = C.codeBg;
        } else if (tag === "FONT") {
          const col = n.getAttribute("color");
          if (col && /^#[0-9a-f]{3,8}$/i.test(col)) a.color = col;
          const sz = parseInt(n.getAttribute("size") || "0", 10);
          if (sz >= 5) a.size = "large";
          else if (sz > 0 && sz <= 2) a.size = "small";
        }
        Object.assign(a, styleAttrs(n));
        if (tag === "A") {
          const href = safeUrl(n.getAttribute("href"));
          const chip = /\bgame-chip\b/.test(String(n.getAttribute("class") || ""));
          const la = { ...a, color: a.color || C.cyan };
          if (chip) la.bold = true;
          else la.underline = true;
          walk(n, la);
          const txt = (n.textContent || "").trim();
          if (href && txt !== href && txt !== href.replace(/\/$/, "")) b.text(" \u2014 " + href + " ", attrs);
          continue;
        }
        const isBlock = BLOCKY.has(tag);
        if (isBlock) b.endLine();
        if (/^H[1-4]$/.test(tag)) a.bold = true;
        walk(n, a);
        if (isBlock) b.endLine();
      }
    };
    const walkTop = (node, attrs) => {
      for (const n of Array.from(node.childNodes)) {
        if (n.nodeType === 1 && (n.tagName === "UL" || n.tagName === "OL")) {
          const type = n.tagName === "OL" ? "ordered" : "bullet";
          for (const li of Array.from(n.children)) {
            if (li.tagName !== "LI") continue;
            const tmp = new OpsBuilder();
            collectRuns(li, attrs, tmp, win);
            const runs = tmp.ops.filter((o) => typeof o.insert === "string" && o.insert !== "\n").map((o) => ({ text: o.insert, attrs: o.attributes }));
            b.listItem(runs, type);
          }
          continue;
        }
        if (n.nodeType === 1 && BLOCKY.has(n.tagName) && n.querySelector && n.querySelector("ul,ol")) {
          b.endLine();
          walkTop(n, attrs);
          b.endLine();
          continue;
        }
        const wrapper = { childNodes: [n] };
        walk(wrapper, attrs);
      }
    };
    walkTop(body, base);
  }
  function collectRuns(li, attrs, tmp, win) {
    emitInlineHtmlFromNode(tmp, li, attrs, win);
  }
  function emitInlineHtmlFromNode(b, node, attrs, win) {
    const holder = node.ownerDocument.createElement("div");
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 1 && (c.tagName === "UL" || c.tagName === "OL")) continue;
      holder.appendChild(c.cloneNode(true));
    }
    emitInlineHtml(b, holder.innerHTML, attrs, win);
  }
  var stars = (n, total = 10) => "\u2605".repeat(n) + "\u2606".repeat(Math.max(0, total - n));
  var dots = (n) => "\u25CF".repeat(n) + "\u25CB".repeat(Math.max(0, 10 - n));
  function linkLines(b, pairs) {
    for (const [label, url] of pairs) {
      if (!url) continue;
      b.text(label + ": ", { color: C.dim });
      b.text(url);
      b.newline();
    }
  }
  function buildFallback(r, opts = {}) {
    const win = opts.win;
    const b = new OpsBuilder();
    if (r.title) b.heading(r.title, 1);
    if (r.game) {
      b.text("\u{1F3AE} \u0418\u0433\u0440\u0430: ", { bold: true });
      b.text(r.game);
      b.newline();
    }
    const sc = SCORES[r.score];
    if (r.score > 0 && sc) {
      b.text("\u2B50 \u041E\u0446\u0435\u043D\u043A\u0430: ", { bold: true });
      b.text(r.score + "/10 ", { bold: true });
      b.text(stars(r.score), { color: C.gold });
      b.text(" \u2014 \xAB" + sc.t + "\xBB " + sc.i);
      b.newline();
      b.text(sc.d, { italic: true, color: C.dim });
      b.newline();
    }
    const v = VERDICT[r.recommend];
    if (v && r.recommend !== "none") {
      b.text("\u0412\u0435\u0440\u0434\u0438\u043A\u0442: ", { bold: true });
      b.text(v.e + " " + v.t, { bold: true, color: v.c });
      b.newline();
    }
    const aspects = r.aspects || [];
    if (aspects.length && aspects.some((a) => a.score > 0 || a.unrated === "na")) {
      b.gap();
      b.heading("\u{1F4CA} \u041E\u0446\u0435\u043D\u043A\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u043E\u0432", 3);
      for (const a of aspects) {
        if (a.score > 0) {
          b.listItem([
            { text: a.name + " \u2014 ", attrs: { bold: true } },
            { text: a.score + "/10 ", attrs: null },
            { text: dots(a.score), attrs: { color: C.cyan } }
          ]);
        } else {
          b.listItem([
            { text: a.name + " \u2014 ", attrs: { bold: true } },
            { text: UNRATED[a.unrated] || UNRATED.unsure, attrs: { italic: true, color: C.dim } }
          ]);
        }
      }
    }
    for (const bl of r.blocks || []) {
      const d = bl.data || {};
      switch (bl.type) {
        case "h2":
        case "h3": {
          const tmp = parseForWalk(bl.html || "", win);
          b.gap();
          b.heading((tmp.textContent || "").replace(/\u00a0/g, " "), bl.type === "h2" ? 2 : 3);
          break;
        }
        case "text":
          b.gap();
          emitInlineHtml(b, bl.html || "", {}, win);
          b.endLine();
          break;
        case "quote":
          b.gap();
          b.text("\u258D ", { color: C.quote, bold: true });
          emitInlineHtml(b, bl.html || "", { italic: true, color: C.quote }, win);
          b.endLine();
          break;
        case "spoiler":
          b.gap();
          b.text("\u26A0\uFE0F \u0421\u043F\u043E\u0439\u043B\u0435\u0440", { bold: true, color: C.gold });
          b.text(" (\u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C):", { italic: true, color: C.dim });
          b.newline();
          emitInlineHtml(b, bl.html || "", { color: C.spoiler, background: C.spoiler }, win);
          b.endLine();
          break;
        case "divider":
          b.gap();
          b.text(d.style === 3 ? "\u2726  \u2726  \u2726" : d.style === 2 ? "\u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014 \u2014" : "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", { color: C.dim });
          b.newline();
          break;
        case "game": {
          b.gap();
          b.text("\u{1F3AE} " + (d.title || "\u0418\u0433\u0440\u0430"), { bold: true, size: "large" });
          b.newline();
          const sub = [d.year, d.dev, d.pub].filter(Boolean).join(" \xB7 ");
          if (sub) {
            b.text(sub, { color: C.dim });
            b.newline();
          }
          if ((d.genres || []).length) {
            b.text("\u0416\u0430\u043D\u0440\u044B: ", { color: C.dim });
            b.text(d.genres.join(", "));
            b.newline();
          }
          const rt = Object.entries(d.ratings || {}).map(([k, val]) => integMeta(r, k).name + ": " + val);
          if (rt.length) {
            b.text("\u041E\u0446\u0435\u043D\u043A\u0438: ", { color: C.dim });
            b.text(rt.join(" \xB7 "), { bold: true, color: C.gold });
            b.newline();
          }
          linkLines(
            b,
            Object.entries(d.links || {}).map(([k, url]) => {
              const m = integMeta(r, k);
              return [m.icon + " " + m.name, url];
            })
          );
          break;
        }
        case "steam": {
          b.gap();
          b.text("\u2668\uFE0F " + (d.title || "\u0418\u0433\u0440\u0430") + " \u2014 \u0432 Steam", { bold: true, size: "large" });
          b.newline();
          if ((d.tags || []).length) {
            b.text("\u0422\u0435\u0433\u0438: ", { color: C.dim });
            b.text(d.tags.join(", "));
            b.newline();
          }
          if (d.date) {
            b.text("\u0414\u0430\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0430: ", { color: C.dim });
            b.text(d.date);
            b.newline();
          }
          b.text("\u0426\u0435\u043D\u0430: ", { color: C.dim });
          if (d.disc) b.text(d.disc + " ", { bold: true, color: "#a4d007" });
          if (d.old) b.text(d.old, { strike: true, color: C.dim });
          if (d.old) b.text(" ");
          b.text(d.price || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430", { bold: true });
          b.newline();
          linkLines(b, [["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 Steam", d.url]]);
          break;
        }
        case "youtube": {
          b.gap();
          b.text("\u25B6\uFE0F " + (d.title || "\u0412\u0438\u0434\u0435\u043E"), { bold: true, size: "large" });
          b.newline();
          b.text([d.channel || "YouTube", d.dur].filter(Boolean).join(" \xB7 "), { color: C.dim });
          b.newline();
          linkLines(b, [["\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C", d.url]]);
          break;
        }
        case "workshop": {
          b.gap();
          b.text("\u{1F6E0}\uFE0F " + (d.title || "\u041F\u0440\u0435\u0434\u043C\u0435\u0442 \u041C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u043E\u0439"), { bold: true, size: "large" });
          b.newline();
          const meta = ["\u041C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u0430\u044F Steam", d.author ? "\u0430\u0432\u0442\u043E\u0440: " + d.author : "", d.subs ? "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432: " + d.subs : "", d.game].filter(Boolean).join(" \xB7 ");
          b.text(meta, { color: C.dim });
          b.newline();
          linkLines(b, [["\u041E\u0442\u043A\u0440\u044B\u0442\u044C", d.url]]);
          break;
        }
        case "image": {
          b.gap();
          const items = Array.isArray(d.items) && d.items.length ? d.items : d.url ? [d] : [];
          for (const it of items) {
            const url = safeUserImageUrl(it.url);
            if (url && /^https?:/i.test(url)) {
              b.embed({ "custom-image": { url, width: it.width || 0, height: it.height || 0 } });
              const cap = String(it.caption || it.alt || "").trim();
              linkLines(b, [[cap ? "\u{1F5BC} " + cap : "\u{1F5BC} \u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435", url]]);
            } else if (url && url.startsWith("data:")) {
              b.text("\u{1F5BC} \u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 (\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F, \u0432\u0438\u0434\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C GameQuill)", { italic: true, color: C.dim });
              b.newline();
            }
          }
          if (d.caption) {
            b.text(String(d.caption), { italic: true, color: C.dim });
            b.newline();
          }
          break;
        }
        default:
          break;
      }
    }
    if ((r.pros || []).length) {
      b.gap();
      b.text("\u2705 \u041F\u043B\u044E\u0441\u044B", { bold: true, color: C.green, size: "large" });
      b.newline();
      for (const p of r.pros) b.listItem([{ text: p.text, attrs: null }]);
    }
    if ((r.cons || []).length) {
      b.gap();
      b.text("\u274C \u041C\u0438\u043D\u0443\u0441\u044B", { bold: true, color: C.red, size: "large" });
      b.newline();
      for (const c of r.cons) b.listItem([{ text: c.text, attrs: null }]);
    }
    const fp = fingerprintText(b.plain);
    b.gap();
    b.text(FOOTER_TEXT, { color: C.dim, size: "small", italic: true });
    return { ops: b.ops, plain: b.plain.replace(/\n{3,}/g, "\n\n").trim(), fp };
  }
  function attachCarriers(ops, { text, vs } = {}) {
    const out = ops.map((o) => ({ ...o, attributes: o.attributes ? { ...o.attributes } : void 0 }));
    for (const o of out) if (!o.attributes) delete o.attributes;
    if (vs) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (typeof out[i].insert === "string" && out[i].insert.includes(FOOTER_TEXT)) {
          out[i].insert = out[i].insert + vs;
          break;
        }
      }
    }
    const nl = { insert: "\n" };
    if (text) nl.attributes = { gq: text };
    out.push(nl);
    return out;
  }
  function opsToHtml(ops) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const lines = [];
    let cur = [];
    for (const op of ops) {
      if (typeof op.insert !== "string") {
        const emb = op.insert && op.insert["custom-image"];
        const src = emb && safeUserImageUrl(emb.url);
        if (src && /^https?:/i.test(src)) {
          if (cur.length) lines.push({ segs: cur, attrs: {} });
          cur = [];
          lines.push({ segs: [], attrs: {}, image: src });
        }
        continue;
      }
      const parts = op.insert.split("\n");
      parts.forEach((p, i) => {
        if (i > 0) {
          lines.push({ segs: cur, attrs: i === parts.length - 1 && op.insert.endsWith("\n") ? op.attributes || {} : {} });
          cur = [];
        }
        if (p) cur.push({ text: p, a: op.attributes || {} });
      });
    }
    if (cur.length) lines.push({ segs: cur, attrs: {} });
    const seg = (s) => {
      let h = esc(s.text);
      const a = s.a;
      if (a.bold) h = `<strong>${h}</strong>`;
      if (a.italic) h = `<em>${h}</em>`;
      if (a.underline) h = `<u>${h}</u>`;
      if (a.strike) h = `<s>${h}</s>`;
      const st = [];
      if (a.color) st.push("color:" + a.color);
      if (a.background) st.push("background-color:" + a.background);
      if (st.length) h = `<span style="${st.join(";")}">${h}</span>`;
      return h;
    };
    let html = "";
    let list = null;
    for (const ln of lines) {
      if (ln.image) {
        if (list) {
          html += `</${list}>`;
          list = null;
        }
        html += `<p><img src="${esc(ln.image)}" alt="" referrerpolicy="no-referrer" loading="lazy"></p>`;
        continue;
      }
      const inner = ln.segs.map(seg).join("");
      const lt = ln.attrs && ln.attrs.list;
      if (lt) {
        const tag = lt === "ordered" ? "ol" : "ul";
        if (list !== tag) {
          if (list) html += `</${list}>`;
          html += `<${tag}>`;
          list = tag;
        }
        html += `<li>${inner}</li>`;
        continue;
      }
      if (list) {
        html += `</${list}>`;
        list = null;
      }
      const hl = ln.attrs && ln.attrs.header || ln.segs[0] && ln.segs[0].a.header;
      html += hl ? `<h${hl}>${inner}</h${hl}>` : `<p>${inner || "<br>"}</p>`;
    }
    if (list) html += `</${list}>`;
    return html;
  }

  // src/shared/gq-payload.js
  var PREFIX = "GQ1.";
  var MAX_COMPRESSED = 48 * 1024;
  var MAX_RAW = 400 * 1024;
  var VS_MAX_CHARS = 6e3;
  var GQError = class extends Error {
    constructor(code, message) {
      super(message || code);
      this.code = code;
    }
  };
  var te = new TextEncoder();
  var td = new TextDecoder("utf-8", { fatal: true });
  async function streamBytes(readable, limit) {
    const reader = readable.getReader();
    const chunks = [];
    let total = 0;
    for (; ; ) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        try {
          await reader.cancel();
        } catch {
        }
        throw new GQError("too-large", "payload expands beyond limit");
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    return out;
  }
  async function deflate(bytes) {
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    w.write(bytes);
    w.close();
    return streamBytes(cs.readable, Infinity);
  }
  function toB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  var hex8 = (n) => (n >>> 0).toString(16).padStart(8, "0");
  async function encodeDoc(doc) {
    const json = JSON.stringify(doc);
    const raw = te.encode(json);
    if (raw.byteLength > MAX_RAW) throw new GQError("too-large", "document too large");
    const comp = await deflate(raw);
    if (comp.byteLength > MAX_COMPRESSED) throw new GQError("too-large", "compressed document too large");
    const crc = crc32(comp);
    const text = PREFIX + toB64url(comp) + "." + hex8(crc);
    const bytes = new Uint8Array(7 + comp.byteLength);
    bytes.set([71, 81, 1, crc >>> 24 & 255, crc >>> 16 & 255, crc >>> 8 & 255, crc & 255], 0);
    bytes.set(comp, 7);
    return { text, bytes, compressedSize: comp.byteLength, rawSize: raw.byteLength };
  }
  function vsEncode(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      s += b < 16 ? String.fromCharCode(65024 + b) : String.fromCodePoint(917760 + (b - 16));
    }
    return s;
  }

  // src/shared/gq-cover.js
  var PALETTES = [
    ["#ff2fb3", "#12062b", "#22d3ee"],
    ["#c8a24a", "#14100a", "#ff7a3d"],
    ["#6ea8ff", "#060a24", "#b388ff"],
    ["#7ee787", "#14202b", "#ffd166"],
    ["#ff8a3d", "#171a22", "#66d9ff"],
    ["#ff8fb1", "#1b0f24", "#7cf3d4"],
    ["#7fd4ff", "#07131f", "#a7ff9c"],
    ["#ffd23f", "#1a1207", "#ff4d6d"]
  ];
  function paletteFor(seed) {
    let s = 0;
    for (const ch of String(seed)) s = s * 31 + ch.charCodeAt(0) >>> 0;
    return PALETTES[s % PALETTES.length];
  }

  // src/shared/gq-theme.js
  var THEMES = {
    "panax-dark": { id: "panax-dark", name: "PANAX Dark" },
    gamequill: { id: "gamequill", name: "GameQuill" }
  };
  var DEFAULT_THEME = "panax-dark";
  function normalizeTheme(id) {
    const k = String(id || "").trim();
    return THEMES[k] ? k : DEFAULT_THEME;
  }
  function themeList() {
    return Object.values(THEMES);
  }

  // src/gamequill/bridge-core.js
  var uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  var plain = (s, n = 200) => str(s, n).replace(/[<>"'&`]/g, "").trim();
  function toEditorReview(x, sanitize) {
    const r = normalizeReview(x, { sanitizeHtml: sanitize });
    if (!r) return null;
    const now = Date.now();
    return {
      id: uid(),
      title: r.title,
      game: r.game,
      createdAt: now,
      updatedAt: r.updatedAt || now,
      score: r.score,
      recommend: r.recommend,
      aspects: r.aspects.map((a) => ({ id: uid(), ...a })),
      pros: r.pros.map((p) => ({ id: uid(), text: p.text })),
      cons: r.cons.map((p) => ({ id: uid(), text: p.text })),
      blocks: r.blocks.map((b) => ({ id: uid(), ...b })),
      integ: r.integ
    };
  }
  function cleanInteg(ni) {
    if (!ni || typeof ni !== "object") return null;
    const id = String(ni.id || "").toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) return null;
    const name = plain(ni.name, 40);
    if (!name) return null;
    return {
      id,
      name,
      icon: plain(ni.icon, 8) || "\u{1F517}",
      color: safeColor(ni.color) || "#7c5cff",
      base: safeUrl(ni.base),
      enabled: ni.enabled !== false,
      ai: !!ni.ai
    };
  }
  function buildIntegMap(review, integrations) {
    const keys = /* @__PURE__ */ new Set();
    for (const b of review && review.blocks || []) {
      const d = b && b.data;
      if (!d) continue;
      Object.keys(d.links || {}).forEach((k) => keys.add(k));
      Object.keys(d.ratings || {}).forEach((k) => keys.add(k));
    }
    const out = {};
    for (const k of keys) {
      const s = (integrations || []).find((i) => i && i.id === k);
      if (s) out[k] = { name: plain(s.name, 40), icon: plain(s.icon, 8), color: safeColor(s.color) || "#7c5cff" };
      else if (DEFAULT_INTEG[k]) out[k] = { ...DEFAULT_INTEG[k] };
    }
    return out;
  }
  var steamCover = (app) => `https://cdn.akamai.steamstatic.com/steam/apps/${String(app).replace(/\D/g, "")}/header.jpg`;
  function ytCover(url) {
    try {
      const u = new URL(url);
      let id = "";
      if (/(^|\.)youtube\.com$/.test(u.hostname)) id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/) || [])[1] || "";
      else if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      return /^[\w-]{6,20}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
    } catch {
      return "";
    }
  }
  var enc = encodeURIComponent;
  function searchLinks(name, app) {
    return {
      steam: `https://store.steampowered.com/app/${app}/`,
      backloggd: `https://www.backloggd.com/search/games/${enc(name)}/`,
      igdb: `https://www.igdb.com/search?type=1&q=${enc(name)}`,
      rawg: `https://rawg.io/search?query=${enc(name)}`,
      metacritic: `https://www.metacritic.com/search/${enc(name)}/`,
      hltb: `https://howlongtobeat.com/?q=${enc(name)}`
    };
  }
  function fmtPrice(p) {
    if (!p || typeof p.final !== "number") return "";
    const n = p.final / 100;
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " " + plain(p.currency, 5);
  }
  function adaptSteamSearch(json) {
    const items = (json && Array.isArray(json.items) ? json.items : []).filter((it) => it && (it.type === "app" || !it.type)).slice(0, 24);
    return items.map((it) => {
      const app = String(it.id || "").replace(/\D/g, "");
      const title = plain(it.name, 120);
      if (!app || !title) return null;
      const pl = it.platforms || {};
      const plat = [pl.windows && "Windows", pl.mac && "macOS", pl.linux && "Linux"].filter(Boolean);
      const r = {};
      const ms = parseInt(it.metascore, 10);
      if (ms > 0) r.metacritic = ms;
      let disc = "";
      let old = "";
      if (it.price && it.price.initial > it.price.final) {
        disc = "-" + Math.round((1 - it.price.final / it.price.initial) * 100) + "%";
        old = fmtPrice({ final: it.price.initial, currency: it.price.currency });
      }
      return {
        id: "steam-" + app,
        title,
        year: "",
        dev: "",
        pub: "",
        genres: [],
        plat,
        pal: paletteFor(app),
        cover: steamCover(app),
        r,
        links: searchLinks(title, app),
        steam: { app, price: it.price ? fmtPrice(it.price) : "", old, disc, date: "", tags: [] },
        trailer: { t: title + " \u2014 \u0442\u0440\u0435\u0439\u043B\u0435\u0440", ch: "\u043F\u043E\u0438\u0441\u043A \u043D\u0430 YouTube", dur: "", url: `https://www.youtube.com/results?search_query=${enc(title + " trailer")}` },
        ws: [{ t: "\u041C\u0430\u0441\u0442\u0435\u0440\u0441\u043A\u0430\u044F: " + title, a: "Steam", s: "", url: `https://steamcommunity.com/app/${app}/workshop/` }]
      };
    }).filter(Boolean);
  }
  function adaptSteamDetails(json, app) {
    const e = json && json[app];
    if (!e || !e.success || !e.data) return null;
    const d = e.data;
    const po = d.price_overview || null;
    const date = plain(d.release_date && d.release_date.date, 40);
    const ym = /(19|20)\d{2}/.exec(date);
    return {
      title: plain(d.name, 120),
      dev: plain((d.developers || []).join(", "), 120),
      pub: plain((d.publishers || []).join(", "), 120),
      genres: (d.genres || []).map((g) => plain(g && g.description, 40)).filter(Boolean).slice(0, 6),
      date,
      year: ym ? ym[0] : "",
      price: d.is_free ? "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" : po ? plain(po.final_formatted, 40) : "",
      old: po && po.discount_percent ? plain(po.initial_formatted, 40) : "",
      disc: po && po.discount_percent ? "-" + parseInt(po.discount_percent, 10) + "%" : "",
      cover: safeImageUrl(d.header_image) || steamCover(app),
      metacritic: d.metacritic && d.metacritic.score ? parseInt(d.metacritic.score, 10) : 0
    };
  }
  function steamWidgetPatch(det) {
    const o = { price: det.price, old: det.old, disc: det.disc, date: det.date, tags: det.genres.slice(0, 4) };
    if (det.title) o.title = det.title;
    if (det.cover) o.cover = det.cover;
    return o;
  }
  function mergeDetails(g, det) {
    if (!g || !det) return g;
    if (det.dev) g.dev = det.dev;
    if (det.pub) g.pub = det.pub;
    if (det.year) g.year = det.year;
    if (det.genres.length) g.genres = det.genres;
    if (det.cover) g.cover = det.cover;
    if (det.metacritic) g.r.metacritic = det.metacritic;
    Object.assign(g.steam, { price: det.price || g.steam.price, old: det.old, disc: det.disc, date: det.date, tags: det.genres.slice(0, 4) });
    return g;
  }

  // src/gamequill/bridge.js
  var ALLOWED_PARENTS = ["https://panaxgames.com", "https://www.panaxgames.com"];
  if (false) {
    ALLOWED_PARENTS.push("http://localhost:8765", "http://127.0.0.1:8765");
    setAllowedImageOrigins(["http://localhost:8765", "http://127.0.0.1:8765"]);
  }
  function stripLocalImageBlocks(doc) {
    if (!doc || !Array.isArray(doc.blocks)) return false;
    const before = doc.blocks.length;
    doc.blocks = doc.blocks.filter((b) => !(b.type === "image" && b.data && String(b.data.url || "").startsWith("data:")));
    return doc.blocks.length !== before;
  }
  var uploadPending = /* @__PURE__ */ new Map();
  var uploadSeq = 0;
  function uploadImage(payload) {
    const reqId = "u" + ++uploadSeq;
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        uploadPending.delete(reqId);
        resolve({ ok: false, code: "timeout", error: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 \u043D\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \u0438 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 panaxgames.com." });
      }, 6e4);
      uploadPending.set(reqId, (res) => {
        clearTimeout(t);
        resolve(res);
      });
      window.GQ.post({ type: "gq:upload-image", reqId, name: payload.name || "", contentType: payload.contentType, width: payload.width || 0, height: payload.height || 0, b64: payload.b64 });
    });
  }
  function onUploadResult(m) {
    const fn = m && m.reqId && uploadPending.get(m.reqId);
    if (!fn) return;
    uploadPending.delete(m.reqId);
    fn(m);
  }
  function detectParent() {
    if (window.parent === window) return null;
    try {
      const ao = location.ancestorOrigins;
      const o = ao && ao.length ? ao[0] : "";
      return ALLOWED_PARENTS.includes(o) ? o : null;
    } catch {
      return null;
    }
  }
  var parentOrigin = detectParent();
  var clean = (h) => sanitizeHtml(h, window);
  async function exportForPost(review, settings, win = window) {
    const s = settings || {};
    const author = s.author && s.author !== "\u0412\u0430\u0448\u0435 \u0438\u043C\u044F" ? s.author : "";
    const integ = buildIntegMap(review, s.integrations);
    const doc = normalizeReview({ ...review, author, integ, updatedAt: Date.now() }, { sanitizeHtml: (h) => sanitizeHtml(h, win) });
    if (!doc || !hasContent(doc)) throw Object.assign(new Error("\u041E\u0431\u0437\u043E\u0440 \u043F\u0443\u0441\u0442\u043E\u0439"), { code: "empty" });
    const fb0 = buildFallback(doc, { win });
    doc.fp = fb0.fp;
    let enc2;
    try {
      enc2 = await encodeDoc(doc);
    } catch (e) {
      if (!(e && e.code === "too-large")) throw e;
      const stripped = stripLocalImageBlocks(doc);
      if (!stripped) throw e;
      const fb1 = buildFallback(doc, { win });
      doc.fp = fb1.fp;
      enc2 = await encodeDoc(doc);
    }
    const fb = buildFallback(doc, { win });
    const vs = enc2.bytes.length <= VS_MAX_CHARS ? vsEncode(enc2.bytes) : "";
    const ops = attachCarriers(fb.ops, { text: enc2.text, vs });
    let plain2 = fb.plain;
    if (vs) {
      const i = plain2.lastIndexOf(FOOTER_TEXT);
      plain2 = i >= 0 ? plain2.slice(0, i + FOOTER_TEXT.length) + vs + plain2.slice(i + FOOTER_TEXT.length) : plain2 + vs;
    }
    return {
      ops,
      plain: plain2,
      html: opsToHtml(ops),
      carrierText: enc2.text,
      fp: fb.fp,
      sizes: { raw: enc2.rawSize, compressed: enc2.compressedSize, vs: vs ? enc2.bytes.length : 0 },
      doc
    };
  }
  async function getJson(url) {
    const r = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function steamSearch(q, cc = "KZ") {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=russian&cc=${encodeURIComponent(cc)}`;
    return adaptSteamSearch(await getJson(url));
  }
  async function steamDetails(app, cc = "KZ") {
    app = String(app).replace(/\D/g, "");
    if (!app) return null;
    const url = `https://store.steampowered.com/api/appdetails?appids=${app}&cc=${encodeURIComponent(cc)}&l=russian`;
    return adaptSteamDetails(await getJson(url), app);
  }
  if (typeof window !== "undefined" && window.document) {
    window.GQ = {
      parentOrigin,
      post(msg) {
        if (parentOrigin) window.parent.postMessage(msg, parentOrigin);
      },
      onMessage(fn) {
        window.addEventListener("message", (e) => {
          if (!parentOrigin || e.source !== window.parent || e.origin !== parentOrigin) return;
          try {
            if (e.data && e.data.type === "gq:upload-result") onUploadResult(e.data);
            fn(e.data);
          } catch (err) {
            console.error("[GameQuill]", err);
          }
        });
      },
      palette: paletteFor,
      color: (c) => safeColor(c) || "#7c5cff",
      url: safeUrl,
      imageUrl: safeImageUrl,
      userImageUrl: safeUserImageUrl,
      publicImageUrl: toPublicPanaxImageUrl,
      probeImageLoad: (url, opts) => probeImageLoad(url, { Image: window.Image, ...opts }),
      shouldPreserveAnimation,
      isGifBytes,
      inspectImageBytes,
      normalizeExternalGifUrl,
      MAX_GALLERY_ITEMS,
      FLAT_GIF_HINT,
      str,
      hasContent: (r) => !!r && hasContent({ title: r.title || "", score: r.score, blocks: r.blocks || [], pros: r.pros || [], cons: r.cons || [], aspects: r.aspects || [] }),
      sanitizeHtml: clean,
      toEditorReview: (x) => toEditorReview(x, clean),
      cleanInteg,
      exportForPost: (r, s) => exportForPost(r, s, window),
      themeList: () => themeList(),
      defaultTheme: DEFAULT_THEME,
      normalizeTheme,
      async loadTheme() {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            const stored = await chrome.storage.local.get({ gqTheme: DEFAULT_THEME });
            return normalizeTheme(stored && stored.gqTheme);
          }
        } catch {
        }
        try {
          return normalizeTheme(localStorage.getItem("gqTheme"));
        } catch {
        }
        return DEFAULT_THEME;
      },
      setTheme(id) {
        const t = normalizeTheme(id);
        try {
          localStorage.setItem("gqTheme", t);
        } catch {
        }
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) chrome.storage.local.set({ gqTheme: t });
        } catch {
        }
        return t;
      },
      makeDemoReview,
      applyDemoReview,
      DEMO_CONFIRM,
      DEMO_GAME,
      compressImage: (src, opts) => compressImage(src, { ...opts, document: window.document, Image: window.Image }),
      uploadImage,
      bytesToBase64,
      base64ToBytes,
      isRasterImageType,
      MAX_DATA_IMAGE,
      MAX_UPLOAD_BYTES,
      steamSearch,
      steamDetails,
      steamWidgetPatch,
      mergeDetails,
      steamCover,
      ytCover
    };
  }
})();
