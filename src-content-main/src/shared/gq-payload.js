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
