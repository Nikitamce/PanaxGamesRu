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
