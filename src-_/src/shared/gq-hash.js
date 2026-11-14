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
