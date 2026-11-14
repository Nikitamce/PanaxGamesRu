var cache2 = /* @__PURE__ */ new Map();
function hashText(s) {
  let h2 = 5381;
  const str2 = String(s || "");
  for (let i = 0; i < str2.length; i++) {
    h2 = (h2 << 5) + h2 ^ str2.charCodeAt(i);
  }
  return (h2 >>> 0).toString(36);
}
async function translateText(text, targetLang = "ru") {
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
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(plain.slice(0, 500))}&langpair=auto|${encodeURIComponent(tl)}`;
    const data = await bgRequest({
      url,
      responseType: "json",
      headers: { Accept: "application/json" }
    });
    const translated = data?.responseData?.translatedText;
    if (translated && !translated.startsWith("MYMEMORY WARNING:")) {
      const result = {
        text: translated.trim(),
        detectedSourceLang: ""
      };
      cache2.set(key, result);
      return result;
    }
  } catch (err) {
    console.debug("[PANAX RU] MyMemory translation failed:", err);
  }
  return null;
}
