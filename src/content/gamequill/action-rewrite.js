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
