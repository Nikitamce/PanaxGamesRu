import { bgRequest } from "./request.js";

var cache2 = /* @__PURE__ */ new Map();
function hashText(s) {
  let h2 = 5381;
  const str2 = String(s || "");
  for (let i = 0; i < str2.length; i++) {
    h2 = (h2 << 5) + h2 ^ str2.charCodeAt(i);
  }
  return (h2 >>> 0).toString(36);
}
function splitMyMemoryChunks(text, maxLen = 450) {
  const parts = String(text || "").split(/(\n\n===PANAX_SPLIT===\n\n)/);
  const chunks = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.includes("===PANAX_SPLIT===") && part.length <= maxLen) {
      chunks.push(part);
      continue;
    }
    let rest = part;
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf("\n", maxLen);
      if (cut < maxLen * 0.4) cut = rest.lastIndexOf(". ", maxLen);
      if (cut < maxLen * 0.4) cut = rest.lastIndexOf(" ", maxLen);
      if (cut <= 0) cut = maxLen;
      else cut += 1;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}
function isValidMyMemoryText(data) {
  const status = Number(data?.responseStatus);
  const translated = String(data?.responseData?.translatedText || "").trim();
  if (!translated || (status && status !== 200)) return false;
  if (translated.startsWith("MYMEMORY WARNING:")) return false;
  if (/INVALID SOURCE LANGUAGE|PLEASE SELECT TWO DISTINCT LANGUAGES|NO QUERY SPECIFIED/i.test(translated)) return false;
  return true;
}
async function translateWithMyMemory(plain, tl) {
  const chunks = splitMyMemoryChunks(plain, 450);
  const out = [];
  let detected = "";
  for (const chunk of chunks) {
    if (!chunk.trim() || /^===PANAX_SPLIT===$/.test(chunk.trim())) {
      out.push(chunk);
      continue;
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=Autodetect|${encodeURIComponent(tl)}`;
    const data = await bgRequest({
      url,
      responseType: "json",
      headers: { Accept: "application/json" }
    });
    if (!isValidMyMemoryText(data)) return null;
    if (!detected && data?.responseData?.detectedLanguage) {
      detected = String(data.responseData.detectedLanguage).toLowerCase().slice(0, 2);
    }
    out.push(String(data.responseData.translatedText).trim());
  }
  const joined = out.join(" ").replace(/\s*===\s*PANAX_SPLIT\s*===\s*/g, "\n\n===PANAX_SPLIT===\n\n").trim();
  return joined ? { text: joined, detectedSourceLang: detected } : null;
}
export async function translateText(text, targetLang = "ru") {
  const plain = String(text || "").trim();
  const tl = String(targetLang || "ru").trim().toLowerCase().slice(0, 2);
  if (!plain) return null;
  const key = `${tl}:${hashText(plain)}`;
  if (cache2.has(key)) {
    return cache2.get(key);
  }
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(plain)}`;
    const data = await bgRequest({
      url,
      responseType: "json",
      headers: { Accept: "application/json" }
    });
    if (Array.isArray(data) && data[0]) {
      const segs = Array.isArray(data[0]) ? data.map((item) => Array.isArray(item) ? item[0] : item).join(" ") : String(data[0]);
      const detected = Array.isArray(data[0]) && data[0][1] ? String(data[0][1]).toLowerCase().slice(0, 2) : "";
      if (segs) {
        const result = { text: segs.trim(), detectedSourceLang: detected };
        cache2.set(key, result);
        return result;
      }
    }
  } catch (err) {
    console.debug("[PANAX RU] Google translate failed, trying MyMemory fallback...", err);
  }
  try {
    const result = await translateWithMyMemory(plain, tl);
    if (result) {
      cache2.set(key, result);
      return result;
    }
  } catch (err) {
    console.debug("[PANAX RU] MyMemory translation failed:", err);
  }
  return null;
}
