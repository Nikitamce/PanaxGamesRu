import { shouldSkipRoot, shouldSkipProse, isChromeContext } from "./skip.js";
import { translateTimeFragment, translateCount, translateNotice, translateActivity, translateTimestamp, splitNotice } from "./time.js";

var ATTR_OK = /* @__PURE__ */ new Set([
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "alt",
  "data-placeholder"
]);
var MONTHS_LOWER = {
  jan: "\u044F\u043D\u0432",
  january: "\u044F\u043D\u0432\u0430\u0440\u044F",
  feb: "\u0444\u0435\u0432",
  february: "\u0444\u0435\u0432\u0440\u0430\u043B\u044F",
  mar: "\u043C\u0430\u0440",
  march: "\u043C\u0430\u0440\u0442\u0430",
  apr: "\u0430\u043F\u0440",
  april: "\u0430\u043F\u0440\u0435\u043B\u044F",
  may: "\u043C\u0430\u044F",
  jun: "\u0438\u044E\u043D",
  june: "\u0438\u044E\u043D\u044F",
  jul: "\u0438\u044E\u043B",
  july: "\u0438\u044E\u043B\u044F",
  aug: "\u0430\u0432\u0433",
  august: "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
  sep: "\u0441\u0435\u043D",
  sept: "\u0441\u0435\u043D",
  september: "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F",
  oct: "\u043E\u043A\u0442",
  october: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F",
  nov: "\u043D\u043E\u044F",
  november: "\u043D\u043E\u044F\u0431\u0440\u044F",
  dec: "\u0434\u0435\u043A",
  december: "\u0434\u0435\u043A\u0430\u0431\u0440\u044F",
  \u043D\u043E\u044F\u0431\u0440\u044C: "\u043D\u043E\u044F\u0431\u0440\u044F",
  \u043D\u043E\u044F\u0431\u0440\u044F: "\u043D\u043E\u044F\u0431\u0440\u044F",
  \u043E\u043A\u0442\u044F\u0431\u0440\u044C: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F",
  \u043E\u043A\u0442\u044F\u0431\u0440\u044F: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F"
};
var MONTHS_SHORT = {
  Jan: "\u044F\u043D\u0432",
  Feb: "\u0444\u0435\u0432",
  Mar: "\u043C\u0430\u0440",
  Apr: "\u0430\u043F\u0440",
  May: "\u043C\u0430\u044F",
  Jun: "\u0438\u044E\u043D",
  Jul: "\u0438\u044E\u043B",
  Aug: "\u0430\u0432\u0433",
  Sep: "\u0441\u0435\u043D",
  Oct: "\u043E\u043A\u0442",
  Nov: "\u043D\u043E\u044F",
  Dec: "\u0434\u0435\u043A"
};
var MONTHS_FULL = {
  January: "\u044F\u043D\u0432\u0430\u0440\u044F",
  February: "\u0444\u0435\u0432\u0440\u0430\u043B\u044F",
  March: "\u043C\u0430\u0440\u0442\u0430",
  April: "\u0430\u043F\u0440\u0435\u043B\u044F",
  May: "\u043C\u0430\u044F",
  June: "\u0438\u044E\u043D\u044F",
  July: "\u0438\u044E\u043B\u044F",
  August: "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
  September: "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F",
  October: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F",
  November: "\u043D\u043E\u044F\u0431\u0440\u044F",
  December: "\u0434\u0435\u043A\u0430\u0431\u0440\u044F"
};
var MONTHS_NOMINATIVE = {
  January: "\u044F\u043D\u0432\u0430\u0440\u044C",
  February: "\u0444\u0435\u0432\u0440\u0430\u043B\u044C",
  March: "\u043C\u0430\u0440\u0442",
  April: "\u0430\u043F\u0440\u0435\u043B\u044C",
  May: "\u043C\u0430\u0439",
  June: "\u0438\u044E\u043D\u044C",
  July: "\u0438\u044E\u043B\u044C",
  August: "\u0430\u0432\u0433\u0443\u0441\u0442",
  September: "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044C",
  October: "\u043E\u043A\u0442\u044F\u0431\u0440\u044C",
  November: "\u043D\u043E\u044F\u0431\u0440\u044C",
  December: "\u0434\u0435\u043A\u0430\u0431\u0440\u044C"
};
var UNIT2 = {
  second: ["\u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"],
  seconds: ["\u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"],
  minute: ["\u043C\u0438\u043D\u0443\u0442\u0443", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442"],
  minutes: ["\u043C\u0438\u043D\u0443\u0442\u0443", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442"],
  hour: ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432"],
  hours: ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432"],
  day: ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"],
  days: ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"],
  week: ["\u043D\u0435\u0434\u0435\u043B\u044E", "\u043D\u0435\u0434\u0435\u043B\u0438", "\u043D\u0435\u0434\u0435\u043B\u044C"],
  weeks: ["\u043D\u0435\u0434\u0435\u043B\u044E", "\u043D\u0435\u0434\u0435\u043B\u0438", "\u043D\u0435\u0434\u0435\u043B\u044C"],
  month: ["\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430", "\u043C\u0435\u0441\u044F\u0446\u0435\u0432"],
  months: ["\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430", "\u043C\u0435\u0441\u044F\u0446\u0435\u0432"],
  year: ["\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430", "\u043B\u0435\u0442"],
  years: ["\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430", "\u043B\u0435\u0442"]
};
var SHORT_AGO = {
  sec: "seconds",
  secs: "seconds",
  min: "minutes",
  mins: "minutes",
  hr: "hours",
  hrs: "hours",
  mo: "months",
  mos: "months",
  yr: "years",
  yrs: "years"
};
var COUNT_WORD = {
  Likes: ["\u043B\u0430\u0439\u043A", "\u043B\u0430\u0439\u043A\u0430", "\u043B\u0430\u0439\u043A\u043E\u0432"],
  Like: ["\u043B\u0430\u0439\u043A", "\u043B\u0430\u0439\u043A\u0430", "\u043B\u0430\u0439\u043A\u043E\u0432"],
  Reviews: ["\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439"],
  Review: ["\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439"],
  Ratings: ["\u043E\u0446\u0435\u043D\u043A\u0430", "\u043E\u0446\u0435\u043D\u043A\u0438", "\u043E\u0446\u0435\u043D\u043E\u043A"],
  Rating: ["\u043E\u0446\u0435\u043D\u043A\u0430", "\u043E\u0446\u0435\u043D\u043A\u0438", "\u043E\u0446\u0435\u043D\u043E\u043A"],
  Games: ["\u0438\u0433\u0440\u0430", "\u0438\u0433\u0440\u044B", "\u0438\u0433\u0440"],
  Game: ["\u0438\u0433\u0440\u0430", "\u0438\u0433\u0440\u044B", "\u0438\u0433\u0440"],
  Comments: ["\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"],
  Comment: ["\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"],
  Followers: ["\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A", "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0430", "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432"],
  Following: ["\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430", "\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438", "\u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A"],
  Lists: ["\u0441\u043F\u0438\u0441\u043E\u043A", "\u0441\u043F\u0438\u0441\u043A\u0430", "\u0441\u043F\u0438\u0441\u043A\u043E\u0432"],
  List: ["\u0441\u043F\u0438\u0441\u043E\u043A", "\u0441\u043F\u0438\u0441\u043A\u0430", "\u0441\u043F\u0438\u0441\u043A\u043E\u0432"],
  Players: ["\u0438\u0433\u0440\u043E\u043A", "\u0438\u0433\u0440\u043E\u043A\u0430", "\u0438\u0433\u0440\u043E\u043A\u043E\u0432"],
  Player: ["\u0438\u0433\u0440\u043E\u043A", "\u0438\u0433\u0440\u043E\u043A\u0430", "\u0438\u0433\u0440\u043E\u043A\u043E\u0432"],
  Results: ["\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432"],
  Result: ["\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432"]
};
function normalizeKey(s) {
  return String(s).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\u2018\u2019\u02BC\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}
export function createEngine(dict) {
  const exact = /* @__PURE__ */ new Map();
  const fold = /* @__PURE__ */ new Map();
  const NO_FOLD = /* @__PURE__ */ new Set(["on", "to", "by", "or", "in", "at", "for", "from", "with"]);
  for (const [key, value] of Object.entries(dict)) {
    const norm = normalizeKey(key);
    if (!norm) continue;
    exact.set(norm, value);
    const lower = norm.toLowerCase();
    if (!NO_FOLD.has(lower) && !fold.has(lower)) fold.set(lower, value);
  }
  let busy = false;
  function plural2(n, forms) {
    const x = Math.abs(Number(n)) % 100;
    const d = x % 10;
    if (x > 10 && x < 20) return forms[2];
    if (d > 1 && d < 5) return forms[1];
    if (d === 1) return forms[0];
    return forms[2];
  }
  function countRepl(n, word) {
    const forms = COUNT_WORD[word];
    if (!forms) return null;
    const num = String(n).replace(/,/g, "");
    const base = /[KMBkmb]$/.test(num) ? 5 : Number(num);
    return `${n} ${plural2(Number.isFinite(base) ? base : 5, forms)}`;
  }
  function preserveEdges2(raw, translated) {
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    return lead + translated + trail;
  }
  function translateText2(raw, el = null) {
    if (!raw) return null;
    const stamped = translateTimestamp(raw) ?? translateTimeFragment(raw, el) ?? translateNotice(raw, el?.parentElement?.textContent || "") ?? translateActivity(raw) ?? translateCount(raw) ?? editCostume(raw, el);
    if (stamped != null && normalizeKey(stamped) !== normalizeKey(raw)) return preserveEdges2(raw, stamped);
    const text = normalizeKey(raw);
    if (!text || text.length > 420) return null;
    if (el && shouldSkipProse(el, text)) {
      const timeLike = /(?:^|[·•.\-\s])\d+\s*[dhms]\s*ago$/i.test(text) || /^\d+\s+[a-z]+\s+ago$/i.test(text) || /^(?:just now|yesterday|today|tomorrow)$/i.test(text) || /^(?:[·•.\-\s]*)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+\d{1,2}(?:,?\s*\d{4})?$/i.test(text) || /^(?:[·•.\-\s]*)?\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*\d{4})?$/i.test(text);
      const multiWord = text.includes(" ") && text.length >= 8;
      const sectionTitle = /^(Preferences|Service|Settings|Account|Language|FAQ|English|Korean|Japanese|Portuguese|Spanish|French|Lv|LV|Ratings|Collections|Collection|Reviews|Review|Posts|Impressions|Playing|Public|Private|Followers only)$/i.test(text);
      const levelLine = /\bLv\.?\s*\d+\b/i.test(text) && text.length < 80;
      const likedLine = /\band\s+(?:\d+\s+)?others?\s+(liked|got help)$/i.test(text) && text.length < 120;
      const profileLine = /^(?:[·•.\-]\s*)?(follows you|\d+\s*[dhms]\s*ago|posts\s+[\d.,]+\s*[kmb]?|follow back|\d+\s+playing|posts|reviews|collections|following games|top)(?:\s+[\d.,]+\s*[kmb]?)?$/i.test(text);
      if (!timeLike && !multiWord && !sectionTitle && !levelLine && !likedLine && !profileLine) return null;
    }
    if (el && !text.includes(" ")) {
      let host2 = el;
      for (let i = 0; i < 4 && host2.parentElement && normalizeKey(host2.textContent || "") === text; i += 1) {
        host2 = host2.parentElement;
      }
      const hostText = normalizeKey(host2.textContent || "");
      if (hostText && hostText !== text && hostText.length > text.length + 2 && !el.closest?.('button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], nav, header, [role="navigation"], [class*="tab-button"], select, option, label')) {
        const extra = hostText.toLowerCase().split(text.toLowerCase()).join(" ").trim().split(/\s+/).filter((w) => w.length >= 2 && /^[a-z]+$/i.test(w));
        if (extra.length >= 1) return null;
      }
    }
    const hit = exact.get(text) ?? fold.get(text.toLowerCase());
    if (hit != null) return preserveEdges2(raw, hit);
    const counted = text.match(
      /^([\d.,]+[KMBkmb]?)\s+(Likes|Like|Reviews|Review|Ratings|Rating|Games|Game|Comments|Comment|Followers|Following|Lists|List|Players|Player|Results|Result)$/
    );
    if (counted) {
      const next = countRepl(counted[1], counted[2]);
      if (next) return preserveEdges2(raw, next);
    }
    const showing = text.match(/^Showing\s+([\d.,]+)\s+results?$/i);
    if (showing) {
      const n = showing[1];
      const word = plural2(n.replace(/,/g, ""), ["\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430", "\u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432"]);
      return preserveEdges2(raw, `\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E: ${n} ${word}`);
    }
    const basedOn = text.match(/^based on\s+([\d.,]+)\s+ratings?$/i);
    if (basedOn) {
      const n = basedOn[1];
      return preserveEdges2(raw, `\u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 ${n} ${plural2(n.replace(/,/g, ""), COUNT_WORD.Ratings)}`);
    }
    const releasedOn = text.match(/^Released:\s*(.+)$/i);
    if (releasedOn) {
      const dateRaw = releasedOn[1];
      const dateTr = translateText2(dateRaw);
      const dateOut = dateTr != null ? normalizeKey(dateTr) : dateRaw;
      return preserveEdges2(raw, `\u0412\u044B\u0448\u043B\u0430: ${dateOut}`);
    }
    const copyright = text.match(/^(?:©|c)\s*(\d{4})\s*PANAX(?:T)?(?:,?\s*Inc\.)?\.?\s*All rights reserved\.?$/i);
    if (copyright) {
      return preserveEdges2(raw, `\xA9 ${copyright[1]} PANAX, Inc. \u0412\u0441\u0435 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u044B.`);
    }
    const levelOnly = text.match(/^Lv\.?\s*(\d+)$/i);
    if (levelOnly) return preserveEdges2(raw, `\u041B\u0432\u043B ${levelOnly[1]}`);
    if (/\bLv\.?\s*\d+\b/i.test(text) && text.length < 80 && !/[.!?].*[.!?]/.test(text)) {
      const next = text.replace(/\bLv\.?\s*(\d+)\b/gi, "\u041B\u0432\u043B $1");
      if (next !== text) return preserveEdges2(raw, next);
    }
    const liked = text.match(/^(.+?)\s+and\s+(?:(\d+)\s+)?others?\s+(liked|got help)$/i);
    if (liked && text.length < 120) {
      const who = liked[1];
      const n = liked[2];
      const helped = /got help/i.test(liked[3]);
      const verb = helped ? null : "\u043E\u0446\u0435\u043D\u0438\u043B\u0438";
      const tail = helped ? n ? `\u0438 \u0435\u0449\u0451 ${n} \u043F\u043E\u043C\u043E\u0433\u043B\u043E` : "\u0438 \u0434\u0440\u0443\u0433\u0438\u043C \u043F\u043E\u043C\u043E\u0433\u043B\u043E" : n ? `\u0438 \u0435\u0449\u0451 ${n} ${plural2(n, ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A"])} ${verb}` : `\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 ${verb}`;
      return preserveEdges2(raw, `${who} ${tail}`);
    }
    const followsYou = text.match(/^(?:[·•.\-]\s*)?Follows you$/i);
    if (followsYou) return preserveEdges2(raw, "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D \u043D\u0430 \u0432\u0430\u0441");
    const profileTab = text.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?(?:\s*[▾▼˅])?$/i);
    if (profileTab) {
      const labels = {
        posts: "\u041F\u043E\u0441\u0442\u044B",
        reviews: "\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438",
        collections: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438",
        "following games": "\u0418\u0433\u0440\u044B \u0432 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\u0445",
        top: "\u0422\u043E\u043F"
      };
      const label = labels[profileTab[1].toLowerCase()];
      if (label) return preserveEdges2(raw, profileTab[2] ? `${label} ${profileTab[2]}` : label);
    }
    const postsCount = text.match(/^Posts\s+(\d+)$/i);
    if (postsCount) return preserveEdges2(raw, `\u041F\u043E\u0441\u0442\u044B ${postsCount[1]}`);
    const playingCount = text.match(/^(\d+)\s+Playing$/i);
    if (playingCount) return preserveEdges2(raw, `${playingCount[1]} \u0438\u0433\u0440\u0430\u044E\u0442`);
    const inlineUpdated = text.match(/^(.*?\s)?Updated\s+(\d+)\s*([dhms])\s*ago(\s.*)?$/i);
    if (inlineUpdated && text.length < 80) {
      const unit = { d: "\u0434", h: "\u0447", m: "\u043C\u0438\u043D", s: "\u0441" }[inlineUpdated[3].toLowerCase()] || inlineUpdated[3];
      const head = inlineUpdated[1] || "";
      const tail = inlineUpdated[4] || "";
      return preserveEdges2(raw, `${head}\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E ${inlineUpdated[2]} ${unit} \u043D\u0430\u0437\u0430\u0434${tail}`);
    }
    const updatedAgo = text.match(/^Updated\s+(\d+)\s*([dhms])\s*ago$/i);
    if (updatedAgo) {
      const unit = { d: "\u0434", h: "\u0447", m: "\u043C\u0438\u043D", s: "\u0441" }[updatedAgo[2].toLowerCase()] || updatedAgo[2];
      return preserveEdges2(raw, `\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E ${updatedAgo[1]} ${unit} \u043D\u0430\u0437\u0430\u0434`);
    }
    const updatedWords = text.match(/^Updated\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (updatedWords) {
      const forms = {
        second: ["\u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"],
        minute: ["\u043C\u0438\u043D\u0443\u0442\u0443", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442"],
        hour: ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432"],
        day: ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"],
        week: ["\u043D\u0435\u0434\u0435\u043B\u044E", "\u043D\u0435\u0434\u0435\u043B\u0438", "\u043D\u0435\u0434\u0435\u043B\u044C"],
        month: ["\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430", "\u043C\u0435\u0441\u044F\u0446\u0435\u0432"],
        year: ["\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430", "\u043B\u0435\u0442"]
      };
      const word = forms[updatedWords[2].toLowerCase()];
      const n = updatedWords[1];
      return preserveEdges2(raw, word ? `\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E ${n} ${plural2(n, word)} \u043D\u0430\u0437\u0430\u0434` : `\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E ${n} \u043D\u0430\u0437\u0430\u0434`);
    }
    const MONTHS2 = {
      jan: "\u044F\u043D\u0432",
      january: "\u044F\u043D\u0432\u0430\u0440\u044F",
      feb: "\u0444\u0435\u0432",
      february: "\u0444\u0435\u0432\u0440\u0430\u043B\u044F",
      mar: "\u043C\u0430\u0440",
      march: "\u043C\u0430\u0440\u0442\u0430",
      apr: "\u0430\u043F\u0440",
      april: "\u0430\u043F\u0440\u0435\u043B\u044F",
      may: "\u043C\u0430\u044F",
      jun: "\u0438\u044E\u043D",
      june: "\u0438\u044E\u043D\u044F",
      jul: "\u0438\u044E\u043B",
      july: "\u0438\u044E\u043B\u044F",
      aug: "\u0430\u0432\u0433",
      august: "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
      sep: "\u0441\u0435\u043D",
      sept: "\u0441\u0435\u043D",
      september: "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F",
      oct: "\u043E\u043A\u0442",
      october: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F",
      nov: "\u043D\u043E\u044F",
      november: "\u043D\u043E\u044F\u0431\u0440\u044F",
      dec: "\u0434\u0435\u043A",
      december: "\u0434\u0435\u043A\u0430\u0431\u0440\u044F"
    };
    const monthDate = text.match(
      /^(?:[·•.\-]\s*)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?|(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*(\d{4}))?)$/i
    );
    if (monthDate) {
      const mon = (monthDate[1] || monthDate[5] || "").toLowerCase();
      const day = monthDate[2] || monthDate[4];
      const year = monthDate[3] || monthDate[6] || "";
      const ruMon = MONTHS2[mon];
      if (ruMon) return preserveEdges2(raw, `${day} ${ruMon}${year ? ` ${year}` : ""}`);
    }
    if (/^just now$/i.test(text)) return preserveEdges2(raw, "\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E");
    if (/^yesterday$/i.test(text)) return preserveEdges2(raw, "\u0432\u0447\u0435\u0440\u0430");
    if (/^today$/i.test(text)) return preserveEdges2(raw, "\u0441\u0435\u0433\u043E\u0434\u043D\u044F");
    if (/^tomorrow$/i.test(text)) return preserveEdges2(raw, "\u0437\u0430\u0432\u0442\u0440\u0430");
    const wordAgo = text.match(/^(?:[·•.\-]\s*)?(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (wordAgo) {
      const forms = {
        second: ["\u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"],
        minute: ["\u043C\u0438\u043D\u0443\u0442\u0443", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442"],
        hour: ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432"],
        day: ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"],
        week: ["\u043D\u0435\u0434\u0435\u043B\u044E", "\u043D\u0435\u0434\u0435\u043B\u0438", "\u043D\u0435\u0434\u0435\u043B\u044C"],
        month: ["\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430", "\u043C\u0435\u0441\u044F\u0446\u0435\u0432"],
        year: ["\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430", "\u043B\u0435\u0442"]
      };
      return preserveEdges2(raw, `${wordAgo[1]} ${plural2(wordAgo[1], forms[wordAgo[2].toLowerCase()])} \u043D\u0430\u0437\u0430\u0434`);
    }
    const compactAgo = text.match(/^(?:[·•.\-\s]*)?(\d+)\s*([dhmswy])\s*ago$/i);
    if (compactAgo) {
      const map = { d: "days", h: "hours", m: "minutes", s: "seconds", w: "weeks", y: "years" };
      const unitKey = map[compactAgo[2].toLowerCase()];
      if (unitKey) {
        return preserveEdges2(raw, `${compactAgo[1]} ${plural2(compactAgo[1], UNIT2[unitKey])} \u043D\u0430\u0437\u0430\u0434`);
      }
    }
    const seeAllCount = text.match(/^See all\s+([\d.,]+)$/i);
    if (seeAllCount) return preserveEdges2(raw, `\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435 (${seeAllCount[1]})`);
    const filtersCount = text.match(/^Filters\s*\(([\d.,]+)\)$/i);
    if (filtersCount) return preserveEdges2(raw, `\u0424\u0438\u043B\u044C\u0442\u0440\u044B (${filtersCount[1]})`);
    const seeResults = text.match(/^See\s+([\d.,]+)\s+results?$/i);
    if (seeResults) {
      const n = seeResults[1];
      return preserveEdges2(
        raw,
        `\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C ${n} ${plural2(n.replace(/,/g, ""), COUNT_WORD.Results)}`
      );
    }
    const ago = text.match(/^(\d+)\s+([a-z]+)\s+ago$/i);
    if (ago) {
      const key = UNIT2[ago[2].toLowerCase()] ? ago[2].toLowerCase() : SHORT_AGO[ago[2].toLowerCase()];
      if (key && UNIT2[key]) {
        return preserveEdges2(raw, `${ago[1]} ${plural2(ago[1], UNIT2[key])} \u043D\u0430\u0437\u0430\u0434`);
      }
    }
    const oneAgo = text.match(/^(?:an?|a)\s+(second|minute|hour|day|week|month|year)\s+ago$/i);
    if (oneAgo) {
      const name = oneAgo[1].toLowerCase();
      return preserveEdges2(raw, `1 ${plural2(1, UNIT2[name] || UNIT2[`${name}s`])} \u043D\u0430\u0437\u0430\u0434`);
    }
    if (/^just now$/i.test(text)) return preserveEdges2(raw, "\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E");
    const month = text.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,)?(?:\s+(\d{4}))?$/
    );
    if (month) {
      return preserveEdges2(
        raw,
        `${month[2]} ${MONTHS_SHORT[month[1]]}${month[3] ? ` ${month[3]}` : ""}`
      );
    }
    const monthLong = text.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/
    );
    if (monthLong) {
      return preserveEdges2(
        raw,
        `${monthLong[2]} ${MONTHS_FULL[monthLong[1]]} ${monthLong[3]}`
      );
    }
    const namedMonth = text.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})$/
    );
    if (namedMonth) {
      return preserveEdges2(
        raw,
        `${MONTHS_NOMINATIVE[namedMonth[1]]} ${namedMonth[2]}`
      );
    }
    if (/^[‹«<]\s*Prev$/i.test(text)) return preserveEdges2(raw, "\u2039 \u041D\u0430\u0437\u0430\u0434");
    if (/^Next\s*[›»>]$/i.test(text)) return preserveEdges2(raw, "\u0414\u0430\u043B\u0435\u0435 \u203A");
    if (/^Prev$/i.test(text)) return preserveEdges2(raw, "\u041D\u0430\u0437\u0430\u0434");
    if (/^Next$/i.test(text)) return preserveEdges2(raw, "\u0414\u0430\u043B\u0435\u0435");
    const withCount = text.match(/^(.+?)\s*\(([\d.,]+)\)$/);
    if (withCount) {
      const head = lookup(withCount[1]) ?? fold.get(withCount[1].toLowerCase());
      if (head) return preserveEdges2(raw, `${head} (${withCount[2]})`);
    }
    const withArrow = text.match(/^(.+?)\s*[\u25BC\u25BE\u25B2\u25B8\u2304▼▲›‹>]+$/);
    if (withArrow) {
      const head = lookup(withArrow[1]) ?? fold.get(withArrow[1].toLowerCase());
      if (head) {
        const suffix = text.slice(withArrow[1].length);
        return preserveEdges2(raw, head + suffix);
      }
    }
    return null;
  }
  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || !el.attributes || shouldSkipRoot(el)) return;
    for (const attr of el.attributes) {
      const name = attr.name.toLowerCase();
      if (!ATTR_OK.has(name)) continue;
      const value = attr.value;
      if (!value || value.length > 240) continue;
      if (name === "alt" && value.length > 40) continue;
      const next = translateText2(value);
      if (next != null && next.trim() !== value) {
        el.setAttribute(attr.name, next.trim());
      }
    }
    if (el.tagName === "INPUT") {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "reset") {
        const next = translateText2(el.value);
        if (next != null && next !== el.value) el.value = next.trim();
      }
    }
  }
  const PHRASING = /* @__PURE__ */ new Set([
    "SPAN",
    "SVG",
    "IMG",
    "I",
    "B",
    "STRONG",
    "EM",
    "SMALL",
    "PATH",
    "BR",
    "WBR",
    "FONT",
    "U",
    "S",
    "MARK",
    "ABBR",
    "TIME",
    "SUB",
    "SUP",
    "DIV"
  ]);
  const LABEL_TAGS = /* @__PURE__ */ new Set([
    "A",
    "BUTTON",
    "SPAN",
    "LABEL",
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "LI",
    "DIV",
    "TD",
    "TH",
    "DT",
    "DD",
    "LEGEND",
    "SUMMARY",
    "OPTION",
    "TEXT",
    "TSPAN"
  ]);
  const PILL_HINT = /rounded-full|min-w-\[|game-follow|pill|chip|badge|tab/i;
  function lookup(text) {
    return exact.get(text) ?? fold.get(text.toLowerCase()) ?? null;
  }
  function markPill(el) {
    if (!el || el.nodeType !== 1) return;
    const cls = el.className && String(el.className);
    const host2 = el.closest?.('button, a, [role="button"]') || el;
    const label = normalizeKey(host2.textContent || "");
    const inBar = host2.closest?.('header, nav, .tab-button-container, [class*="tab-button-container"]');
    const wideLabel = /^(?:follow back|подписаться в ответ|edit profile|редактировать профиль|share profile|поделиться профилем|connect playstation account|connect xbox account|подключить аккаунт playstation|подключить аккаунт xbox)$/i.test(label);
    if (wideLabel && !inBar && host2.tagName !== "BODY" && host2.tagName !== "HTML") {
      host2.setAttribute("data-panax-ru", "wide");
    }
    if (cls && PILL_HINT.test(cls)) el.setAttribute("data-panax-ru", "pill");
    else if (!el.hasAttribute("data-panax-ru")) el.setAttribute("data-panax-ru", "1");
  }
  function ownText(el) {
    let s = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.nodeValue;
    }
    return normalizeKey(s);
  }
  function translateOwnText(el) {
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3);
    if (!texts.length) return false;
    const joined = texts.map((n) => n.nodeValue).join("");
    const fragmentedNotice = el.childElementCount > 0 && /Get it|sale ends|Check your|Загляните/.test(el.textContent || "");
    const next = fragmentedNotice ? null : translateText2(joined, el);
    if (next != null && normalizeKey(next) !== normalizeKey(joined)) {
      texts[0].nodeValue = next;
      for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = "";
      markPill(el);
      return true;
    }
    let changed = false;
    for (const n of texts) {
      const tr = translateText2(n.nodeValue, el);
      if (tr != null && tr !== n.nodeValue) {
        n.nodeValue = tr;
        changed = true;
      }
    }
    if (changed) markPill(el);
    return changed;
  }
  function translateComposite(el) {
    if (!el || el.nodeType !== 1 || !LABEL_TAGS.has(el.tagName)) return false;
    if (el.isContentEditable || shouldSkipRoot(el)) return false;
    if (el.tagName === "SVG" || el.tagName === "IMG" || el.tagName === "PATH") return false;
    if (el.childElementCount > 40) return false;
    if (el.querySelector("input, textarea, select, video, iframe, canvas, svg, img")) {
      translateOwnText(el);
      return false;
    }
    translateOwnText(el);
    const kids = [...el.children];
    const letterSplit = kids.length > 1 && kids.every(
      (c) => (c.tagName === "SPAN" || c.tagName === "FONT" || c.tagName === "B" || c.tagName === "I") && !c.querySelector("svg, img") && normalizeKey(c.textContent || "").length <= 1
    );
    if (!letterSplit) return false;
    const text = normalizeKey(el.textContent || "");
    if (!text || text.length < 2 || text.length > 160) return false;
    if (shouldSkipProse(el, text)) return false;
    let hit = lookup(text);
    if (hit == null) {
      const flex = translateText2(text, el);
      if (flex != null) hit = normalizeKey(flex);
    }
    if (hit == null || hit === text) return false;
    el.textContent = hit;
    markPill(el);
    return true;
  }
  let pseudoStyle = null;
  function ensurePseudoStyle() {
    if (pseudoStyle && pseudoStyle.isConnected) return pseudoStyle;
    pseudoStyle = document.getElementById("panax-ru-pseudo");
    if (!pseudoStyle) {
      pseudoStyle = document.createElement("style");
      pseudoStyle.id = "panax-ru-pseudo";
      (document.head || document.documentElement).appendChild(pseudoStyle);
    }
    pseudoStyle.textContent = [
      ".panax-ru-before::before { content: attr(data-panax-before) !important; }",
      ".panax-ru-after::after { content: attr(data-panax-after) !important; }"
    ].join("\n");
    return pseudoStyle;
  }
  function translatePseudos(root) {
    if (!root || root.nodeType !== 1) return;
    ensurePseudoStyle();
    const nodes = root.querySelectorAll("a, button, span, div, label, p, i, em, small, li, h1, h2, h3, h4");
    for (const el of nodes) {
      if (shouldSkipRoot(el)) continue;
      if (normalizeKey(el.textContent || "").length > 64) continue;
      for (const side of ["::before", "::after"]) {
        let content = "";
        try {
          content = getComputedStyle(el, side).content;
        } catch {
          continue;
        }
        const clean2 = String(content || "").replace(/^["']|["']$/g, "").trim();
        if (!clean2 || clean2 === "none" || clean2 === "normal") continue;
        const translated = translateText2(clean2);
        if (translated == null) continue;
        const next = translated.trim();
        if (!next || next === clean2) continue;
        if (side === "::before") {
          el.setAttribute("data-panax-before", next);
          el.classList.add("panax-ru-before");
        } else {
          el.setAttribute("data-panax-after", next);
          el.classList.add("panax-ru-after");
        }
      }
    }
  }
  function paintNotice(el) {
    if (!el || el.nodeType !== 1 || el.childElementCount > 40) return false;
    const rawText = el.textContent || "";
    if (/(?:Level\s*Up|Уровень\s*Up|Log in daily|Check your|is now|is сейчас|Get it|sale ends|до окончания|just dropped a new post|replied\s+(?:on|to)\s+your|(?:liked|нравится)\s+your|commented\s+on\s+your)/i.test(rawText)) {
      const nodes = [el, ...el.querySelectorAll("p, div, span, a, li, h2, h3, h4")];
      for (const p of nodes) {
        const context = normalizeKey(p.textContent || "");
        if (!/Get it/i.test(context) || !/sale ends/i.test(context) || context.length > 220) continue;
        const walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let textNode;
        while (textNode = walk.nextNode()) {
          const raw = textNode.nodeValue;
          const translated = translateNotice(raw, context);
          if (translated == null) continue;
          const next2 = preserveEdges2(raw, translated);
          if (next2 !== raw) textNode.nodeValue = next2;
        }
      }
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || "");
        const isNotice = /(?:replied (?:on|to)|liked|нравится|commented on)\s+your/i.test(t) || /оценил(?:и)?ваш|ответилнаваш|прокомментировалваш|нравитсяваш|ваш(?:комментарий|пост|ответ)|вашурецензию/i.test(t);
        if (!isNotice || t.length >= 160) continue;
        const verb = /others?\s+(?:liked|нравится|оценили|оценил)/i.test(t) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438" : "\u043E\u0446\u0435\u043D\u0438\u043B";
        const people2 = (num) => plural2(Number(num), ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A"]);
        for (const n of p.childNodes) {
          if (n.nodeType === 3) {
            const next2 = n.nodeValue.replace(/оценилваш/gi, `${verb} \u0432\u0430\u0448`).replace(/оцениливаш/gi, "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448").replace(/нравитсяваш/gi, `${verb} \u0432\u0430\u0448`).replace(/ответилнаваш/gi, "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448").replace(/прокомментировалваш/gi, "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448").replace(/вашурецензию/gi, "\u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E").replace(/ваш(?:комментарий|пост|ответ)/gi, (m) => ({ "\u0432\u0430\u0448\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439": "\u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u0432\u0430\u0448\u043F\u043E\u0441\u0442": "\u0432\u0430\u0448 \u043F\u043E\u0441\u0442", "\u0432\u0430\u0448\u043E\u0442\u0432\u0435\u0442": "\u0432\u0430\u0448 \u043E\u0442\u0432\u0435\u0442" })[m.toLowerCase()] || m).replace(/replied (?:on|to) your (?:comment|комментарий)/gi, "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439").replace(/replied (?:on|to) your/gi, "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448").replace(/(?:liked|нравится) your (?:comment|комментарий)/gi, `${verb} \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439`).replace(/(?:liked|нравится) your (?:post|пост)/gi, `${verb} \u0432\u0430\u0448 \u043F\u043E\u0441\u0442`).replace(/(?:liked|нравится) your (?:review|рецензию|обзор)/gi, `${verb} \u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E`).replace(/(?:liked|нравится) your/gi, `${verb} \u0432\u0430\u0448`).replace(/commented on your (?:post|пост)/gi, "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442").replace(/commented on your/gi, "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448").replace(/replied (?:on|to)(?=\s|$)/gi, "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430").replace(/commented on(?=\s|$)/gi, "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B").replace(/\b(?:and|&)\s+(\d+)\s+others?\b/gi, (s, num) => `\u0438 \u0435\u0449\u0451 ${num} ${people2(num)}`).replace(/\bYou(?=\s+(?:and|&|и)(?:\s|$))/g, "\u0412\u044B");
            if (next2 !== n.nodeValue) n.nodeValue = next2;
          }
        }
        for (const cLink of p.querySelectorAll("a, span")) {
          if (cLink.childElementCount > 0) continue;
          const raw = cLink.textContent || "";
          const cText = normalizeKey(raw);
          let ru = null;
          if (/^(?:comment|Комментарий)$/i.test(cText)) ru = "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439";
          else if (/^(?:post|Пост)$/i.test(cText)) ru = "\u043F\u043E\u0441\u0442";
          else if (/^(?:liked|Нравится)$/i.test(cText)) ru = verb;
          else if (/^your$/i.test(cText)) ru = "\u0432\u0430\u0448";
          if (!ru) continue;
          const lead2 = raw.match(/^\s*/)[0];
          const trail = raw.match(/\s*$/)[0];
          const next2 = lead2 + ru + trail;
          if (next2 !== raw) {
            const texts = [...cLink.childNodes].filter((n) => n.nodeType === 3);
            if (texts.length) {
              if (texts[0].nodeValue !== next2) texts[0].nodeValue = next2;
              for (const n of texts.slice(1)) if (n.nodeValue !== "") n.nodeValue = "";
            }
          }
        }
      }
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || "");
        if (/just dropped a new post/i.test(t) && t.length < 160) {
          for (const n of p.childNodes) {
            if (n.nodeType === 3 && /just dropped a new post/i.test(n.nodeValue)) {
              n.nodeValue = n.nodeValue.replace(/just dropped a new post/gi, "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442");
            }
          }
        }
      }
      for (const p of nodes) {
        if (p.querySelector("img, svg, div, p")) continue;
        const t = normalizeKey(p.textContent || "");
        if (/^log in daily to (?:level up|новый уровень!?)\s*(?:&|and)?\s*unlock avatar items!\s*streak resets daily at 3 am\.?$/i.test(t)) {
          p.textContent = "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00.";
        }
      }
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || "");
        if (!/log in daily/i.test(t) && (/(?:Level\s*Up!|Уровень\s*Up!)/i.test(t) || /(?:Level\s*Up|Уровень\s*Up)/i.test(t) && /\b(?:Lv|Лвл)\.?\s*\d+/i.test(t))) {
          for (const n of p.childNodes) {
            if (n.nodeType === 3 && /(?:Level\s*Up!?|Уровень\s*Up!?)/i.test(n.nodeValue)) {
              n.nodeValue = n.nodeValue.replace(/(?:Level\s*Up!?|Уровень\s*Up!?)\s*/gi, "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C! ");
            }
          }
        }
      }
      for (const p of nodes) {
        if (p.querySelector("img, svg, div, p")) continue;
        const t = normalizeKey(p.textContent || "");
        if (/^Check your\s+(?:profile|профиль|Профиль)\s+(?:to|До)?\s*see what['’]s new\.?$/i.test(t)) {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          let tn;
          while (tn = walker.nextNode()) textNodes.push(tn);
          let leadDone = false;
          let tailDone = false;
          for (const node of textNodes) {
            const raw = node.nodeValue;
            const norm = normalizeKey(raw).toLowerCase();
            if (!norm) continue;
            if (/^(?:check your|check|your)$/i.test(norm)) {
              if (!leadDone) {
                node.nodeValue = preserveEdges2(raw, "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439");
                leadDone = true;
              } else {
                node.nodeValue = "";
              }
            } else if (/^(?:profile|профиль)$/i.test(norm)) {
              node.nodeValue = preserveEdges2(raw, "\u043F\u0440\u043E\u0444\u0438\u043B\u044C");
            } else if (/^(?:to|see|what's|what|s|new|new\.)$/i.test(norm) || /(?:to|До)?\s*see what/i.test(norm)) {
              if (!tailDone) {
                node.nodeValue = preserveEdges2(raw, ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E.");
                tailDone = true;
              } else {
                node.nodeValue = "";
              }
            }
          }
        }
      }
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || "");
        if (/\b(?:is\s+now|is\s+сейчас|is)\s+(?:now\s+|сейчас\s+)?\d+%/i.test(t) && t.length < 220) {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          let tn;
          while (tn = walker.nextNode()) {
            if (tn.nodeValue && tn.nodeValue.trim()) textNodes.push(tn);
          }
          let placedBadge = false;
          for (let i = 0; i < textNodes.length; i += 1) {
            const node = textNodes[i];
            const val = node.nodeValue;
            const cleanVal = val.trim().toLowerCase();
            if (cleanVal === "is") {
              node.nodeValue = preserveEdges2(val, "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430");
              placedBadge = true;
              const nextNode = textNodes[i + 1];
              if (nextNode && /^(?:now|сейчас)$/i.test(nextNode.nodeValue.trim())) {
                nextNode.nodeValue = "";
              }
            } else if (cleanVal === "now" || cleanVal === "\u0441\u0435\u0439\u0447\u0430\u0441") {
              if (!placedBadge) {
                node.nodeValue = preserveEdges2(val, "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430");
                placedBadge = true;
              } else {
                node.nodeValue = "";
              }
            } else if (/\b(?:is\s+now|is\s+сейчас)\b/i.test(val)) {
              node.nodeValue = val.replace(/\b(?:is\s+now|is\s+сейчас)\s+(\d+)%(?:\s*off)?/gi, "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430 $1%").replace(/\b(?:is\s+now|is\s+сейчас)\b/gi, "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430");
            }
          }
        }
      }
      for (const p of nodes) {
        if (p.querySelector("img, svg, div, p")) continue;
        const t = normalizeKey(p.textContent || "");
        if (t.length > 180 || /\b(is now|is сейчас)\b|— скидка/i.test(t)) continue;
        if (/Get it|before the sale|Купите в Steam|до окончания скидки/i.test(t)) {
          const m = t.match(/^(?:Get it|Купите)?\s*(?:on|в|Вкл\.)?\s*Steam\s*(?:for|за)?\s+([\s\S]+?)\s*(?:before the sale ends|before\s+(?:the\s+)?sale\s+ends|до окончания скидки)?\s*(?:on|в|Вкл\.)?\s*([a-zA-Zа-яА-ЯёЁ]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?\.?$/i);
          if (m) {
            const monKey = m[2].toLowerCase();
            const mon = MONTHS_LOWER[monKey] || MONTHS_FULL[monKey] || MONTHS_SHORT[monKey] || m[2];
            const day = parseInt(m[3], 10);
            const year = m[4] ? ` ${m[4]}` : "";
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            let tn;
            while (tn = walker.nextNode()) textNodes.push(tn);
            let buyDone = false;
            let endsDone = false;
            let dateDone = false;
            for (const node of textNodes) {
              const raw = node.nodeValue;
              const norm = normalizeKey(raw).toLowerCase();
              if (!norm) continue;
              if (/^(?:get it|get|it|on|купите|купите в)$/i.test(norm) || norm === "\u0432" && !endsDone) {
                if (!buyDone) {
                  node.nodeValue = preserveEdges2(raw, "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432");
                  buyDone = true;
                } else {
                  node.nodeValue = "";
                }
              } else if (/^steam$/i.test(norm)) {
              } else if (/^for$/i.test(norm)) {
                node.nodeValue = preserveEdges2(raw, "\u0437\u0430");
              } else if (/^(?:before the sale ends|before|the|sale|ends|before the sale ends on)$/i.test(norm)) {
                if (!endsDone) {
                  node.nodeValue = preserveEdges2(raw, "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438");
                  endsDone = true;
                } else {
                  node.nodeValue = "";
                }
              } else if (norm === "on" || norm === "\u0432" && endsDone) {
                node.nodeValue = "";
              } else if (MONTHS_LOWER[norm] || /^(?:november|ноябрь|ноября|december|декабрь|декабря|october|октябрь|октября)$/i.test(norm)) {
                if (!dateDone) {
                  node.nodeValue = preserveEdges2(raw, `${day} ${mon}${year}`);
                  dateDone = true;
                } else {
                  node.nodeValue = "";
                }
              } else if (/^\d{1,2}$/.test(norm)) {
                if (dateDone) {
                  node.nodeValue = "";
                } else {
                  node.nodeValue = preserveEdges2(raw, String(day));
                }
              }
            }
          }
        }
      }
    }
    let acc = "";
    const headerNodes = [];
    const take = (node) => {
      if (node.nodeType === 3) {
        if (normalizeKey(node.nodeValue || "")) headerNodes.push(node);
        acc += node.nodeValue || "";
        return;
      }
      if (node.nodeType !== 1) return;
      if (["IMG", "SVG", "TIME", "VIDEO"].includes(node.tagName)) return;
      const t = normalizeKey(node.textContent || "");
      if (t.length > 100 && !/commented on|replied (?:on|to)|(?:liked|нравится)\s+(?:your|ваш)|started following/i.test(t)) return;
      for (const child of node.childNodes) take(child);
    };
    for (const child of el.childNodes) {
      const before = normalizeKey(acc);
      take(child);
      if (splitNotice(normalizeKey(acc))) break;
      if (normalizeKey(acc) === before && child.nodeType === 1 && normalizeKey(child.textContent || "").length > 40) break;
    }
    const parsed = splitNotice(normalizeKey(acc));
    if (!parsed) return false;
    const name = parsed.name.toLowerCase();
    const actionNodes = headerNodes.filter((n) => {
      const own2 = normalizeKey(n.nodeValue || "").toLowerCase();
      if (!own2) return false;
      if (name && own2 === name) return false;
      const parentText = normalizeKey(n.parentElement?.textContent || "").toLowerCase();
      if (name && parentText === name) return false;
      return true;
    });
    if (!actionNodes.length) return false;
    const own = normalizeKey(actionNodes[0].nodeValue || "").toLowerCase();
    const lead = (actionNodes[0].nodeValue.match(/^\s*/) || [""])[0];
    const next = name && own.startsWith(name) ? `${parsed.name} ${parsed.ru}` : `${lead}${parsed.ru}`;
    if (actionNodes[0].nodeValue !== next) actionNodes[0].nodeValue = next;
    for (let i = 1; i < actionNodes.length; i += 1) {
      if (actionNodes[i].nodeValue !== "") actionNodes[i].nodeValue = "";
    }
    return true;
  }
  function stampComposer(node) {
    if (!node || node.nodeType !== 1) return;
    for (const attr of ["placeholder", "data-placeholder", "aria-placeholder", "aria-label"]) {
      const ph = node.getAttribute(attr);
      if (!ph) continue;
      const next = translateActivity(ph) || translateText2(ph);
      if (next && normalizeKey(next) !== normalizeKey(ph)) node.setAttribute(attr, next);
    }
    const visit = (el) => {
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          const prompt = translateActivity(child.nodeValue);
          if (prompt && /отметить игру|Выберите эмодзи/.test(prompt)) {
            child.nodeValue = preserveEdges2(child.nodeValue, prompt);
          }
        } else if (child.nodeType === 1) {
          const prompt = translateActivity(child.textContent || "");
          if (prompt && /отметить игру/.test(prompt) && !child.querySelector("img, svg")) child.textContent = prompt;
          else visit(child);
        }
      }
    };
    visit(node);
  }
  const EDITOR_LABELS = {
    edit: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
    exit: "\u0412\u044B\u0439\u0442\u0438",
    colors: "\u0426\u0432\u0435\u0442\u0430",
    hair: "\u0412\u043E\u043B\u043E\u0441\u044B",
    beard: "\u0411\u043E\u0440\u043E\u0434\u0430",
    shape: "\u0424\u043E\u0440\u043C\u0430",
    brows: "\u0411\u0440\u043E\u0432\u0438",
    eyes: "\u0413\u043B\u0430\u0437\u0430",
    nose: "\u041D\u043E\u0441",
    mouth: "\u0420\u043E\u0442",
    top: "\u0412\u0435\u0440\u0445",
    bottom: "\u041D\u0438\u0437",
    shoes: "\u041E\u0431\u0443\u0432\u044C",
    glasses: "\u041E\u0447\u043A\u0438",
    cap: "\u041A\u0435\u043F\u043A\u0430",
    age: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442",
    makeup: "\u041C\u0430\u043A\u0438\u044F\u0436",
    paint: "\u041A\u0440\u0430\u0441\u043A\u0430",
    scar: "\u0428\u0440\u0430\u043C",
    spot: "\u041F\u044F\u0442\u043D\u043E",
    pose: "\u041F\u043E\u0437\u0430",
    custom: "\u0421\u0432\u043E\u0451"
  };
  function editCostume(raw, el) {
    const host2 = el?.closest?.('.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]');
    if (!host2) return null;
    return EDITOR_LABELS[normalizeKey(raw).toLowerCase()] || null;
  }
  function moreButton(node) {
    if (!node || node.nodeType !== 3) return null;
    const parent = node.parentElement;
    if (!parent?.classList?.contains("more-button-inline") && !parent?.closest?.(".more-button-inline")) return null;
    if (!/^more$/i.test(normalizeKey(node.nodeValue || ""))) return null;
    return "\u0415\u0449\u0451";
  }
  function walkTimestamps(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      const stamped = translateTimestamp(node.nodeValue) ?? translateNotice(node.nodeValue, node.parentElement?.textContent || "") ?? translateActivity(node.nodeValue) ?? translateCount(node.nodeValue) ?? editCostume(node.nodeValue, node.parentElement) ?? moreButton(node);
      if (stamped != null && normalizeKey(stamped) !== normalizeKey(node.nodeValue)) {
        node.nodeValue = preserveEdges2(node.nodeValue, stamped);
      }
      return;
    }
    if (node.nodeType === 11) {
      for (const child of node.childNodes) walkTimestamps(child);
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.tagName === "TEXTAREA" || node.isContentEditable) {
      stampComposer(node);
      return;
    }
    for (const attr of ["placeholder", "title", "aria-label", "data-placeholder"]) {
      const ph = node.getAttribute?.(attr);
      if (!ph) continue;
      const nextPh = translateActivity(ph);
      if (nextPh && normalizeKey(nextPh) !== normalizeKey(ph)) node.setAttribute(attr, nextPh);
    }
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"].includes(node.tagName)) return;
    paintNotice(node);
    const graphic = node.querySelector?.("svg, img, input, textarea, video, canvas");
    const text = normalizeKey(node.textContent || "");
    if (!graphic && text.length >= 2 && text.length <= 32 && node.childElementCount <= 6) {
      const stamped = translateTimestamp(text);
      if (stamped != null && normalizeKey(stamped) !== text) {
        const texts = [...node.childNodes].filter((n) => n.nodeType === 3);
        if (texts.length && node.childElementCount === 0) {
          texts[0].nodeValue = stamped;
          for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = "";
          return;
        }
        if (node.childElementCount > 0 && [...node.children].every((c) => normalizeKey(c.textContent || "").length <= 16)) {
          node.textContent = stamped;
          return;
        }
      }
    }
    for (const child of node.childNodes) walkTimestamps(child);
  }
  function translateNode(node) {
    if (!node) return;
    try {
      if (node.nodeType === 11) {
        for (const child of node.childNodes) translateNode(child);
        return;
      }
      if (node.nodeType === 3) {
        const parent = node.parentElement;
        if (parent && parent.isContentEditable) return;
        if (parent && (shouldSkipRoot(parent) || ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"].includes(parent.tagName))) {
          const stamped = translateTimestamp(node.nodeValue) ?? translateNotice(node.nodeValue, node.parentElement?.textContent || "") ?? translateActivity(node.nodeValue) ?? translateCount(node.nodeValue) ?? editCostume(node.nodeValue, node.parentElement) ?? moreButton(node);
          if (stamped != null && normalizeKey(stamped) !== normalizeKey(node.nodeValue)) {
            node.nodeValue = preserveEdges2(node.nodeValue, stamped);
          }
          return;
        }
        const next = translateText2(node.nodeValue, parent);
        if (next != null && next !== node.nodeValue) {
          node.nodeValue = next;
          if (parent) markPill(parent);
        }
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === "TEXTAREA" || node.isContentEditable) {
        stampComposer(node);
        return;
      }
      if (["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "CANVAS"].includes(node.tagName)) {
        return;
      }
      if (shouldSkipRoot(node)) {
        walkTimestamps(node);
        return;
      }
      if (/^(?:follow back|подписаться в ответ|edit profile|редактировать профиль|share profile|поделиться профилем|connect playstation account|connect xbox account|подключить аккаунт playstation|подключить аккаунт xbox)$/i.test(normalizeKey(node.textContent || ""))) markPill(node);
      paintNotice(node);
      translateAttrs(node);
      if (node.childElementCount > 0 && node.childElementCount <= 4 && !node.querySelector("svg, img, input, textarea")) {
        const joined = normalizeKey(node.textContent || "");
        const stamped = joined.length <= 32 ? translateTimestamp(joined) : null;
        if (stamped != null && normalizeKey(stamped) !== joined && [...node.children].every((c) => normalizeKey(c.textContent || "").length <= 16)) {
          node.textContent = stamped;
          markPill(node);
          return;
        }
      }
      translateOwnText(node);
      if (translateComposite(node)) return;
      if (node.shadowRoot) translateNode(node.shadowRoot);
      for (const child of node.childNodes) translateNode(child);
    } catch {
    }
  }
  function translateLeafLabels(el) {
    if (!el || el.nodeType !== 1) return;
    translateOwnText(el);
    const label = el.querySelector?.(":scope > span.label, :scope > .label, span.label, .label");
    if (label && !label.querySelector("svg, img")) {
      if (label.childElementCount === 0) {
        const text = normalizeKey(label.textContent || "");
        const tr = text ? translateText2(text, label) : null;
        if (tr != null && normalizeKey(tr) !== text) {
          label.textContent = normalizeKey(tr);
          markPill(label);
          label.setAttribute("data-panax-ru", "label");
        }
      } else {
        translateOwnText(label);
        translateComposite(label);
      }
    }
    let leaves;
    try {
      leaves = el.querySelectorAll("span, div, p, a, button, li");
    } catch {
      return;
    }
    for (const leaf of leaves) {
      if (shouldSkipRoot(leaf)) continue;
      if (leaf.querySelector("svg, img, input, textarea")) continue;
      if (leaf.childElementCount > 0) {
        translateOwnText(leaf);
        translateComposite(leaf);
        continue;
      }
      const text = normalizeKey(leaf.textContent || "");
      if (!text || text.length > 80) continue;
      const tr = translateText2(text, leaf);
      if (tr != null && normalizeKey(tr) !== text) {
        leaf.textContent = normalizeKey(tr);
        markPill(leaf);
      }
    }
  }
  function translateKnown(root) {
    if (!root || root.querySelectorAll == null) return;
    const sels = [
      "button.tab-button",
      '.tab-button:is(button, a, [role="tab"])',
      ".game-follow-round-button",
      // Live DOM: <p class="tab-button-label">Following</p>
      "p.tab-button-label",
      ".tab-button-label",
      "button.tab-button p",
      'button[class*="rounded-full"]',
      'a[class*="rounded-full"]',
      "span.label",
      ".label",
      // Card CTAs — only in main/cards, not every link in a post
      'main button[class*="rounded"]',
      '[class*="game-card"] button',
      '[class*="GameCard"] button',
      'article button[class*="rounded-full"]'
    ];
    const seen2 = /* @__PURE__ */ new Set();
    for (const sel of sels) {
      let list;
      try {
        list = root.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of list) {
        if (seen2.has(el) || shouldSkipRoot(el)) continue;
        seen2.add(el);
        translateLeafLabels(el);
      }
    }
  }
  const STUBBORN = new Set(
    [
      "Hot",
      "New",
      "HOT",
      "NEW",
      "Following",
      "Followers",
      "Follower",
      "Latest",
      "News",
      "Add to Wishlist",
      "Add to wishlist",
      "Add to",
      "View Details",
      "View details",
      "View full details",
      "View Full Details",
      "Get Started",
      "Ratings",
      "Rating",
      "Also Playing",
      "Also Wishlisted",
      "Similar",
      "Similar games",
      "Recommended",
      "Most Wishlisted",
      "Trending Games Now",
      "Trending Games",
      "Set status",
      "Status",
      "Wishlist",
      "Platforms",
      "Developer",
      "Publisher",
      "Release",
      "Game info",
      "Join the Ultimate Gaming Community!",
      "Join now and level up your gaming!",
      "Join us for free",
      "Join now",
      "Discover, track, and share your gaming journey with fellow enthusiasts.",
      "Players with this game",
      "Wishlist Users",
      "How was it?",
      "Public",
      "Completionist",
      "Main Story",
      "Main + Sides",
      "How Long To Beat",
      "Level Up!",
      "Level up!",
      "\u0423\u0440\u043E\u0432\u0435\u043D\u044C Up!",
      "Check your profile to see what's new.",
      "just dropped a new post",
      "is now",
      "Get it",
      "Get it on Steam",
      "before the sale ends"
    ].map(normalizeKey)
  );
  const CHROME_SCOPE_SELS = [
    "header",
    "nav",
    "footer",
    "aside",
    '[role="banner"]',
    '[role="navigation"]',
    '[role="dialog"]',
    '[role="complementary"]',
    '[role="menu"]',
    '[role="menuitem"]',
    '[class*="opacity-"]',
    "button.tab-button",
    '.tab-button:is(button, a, [role="tab"])',
    "p.tab-button-label",
    ".game-follow-round-button",
    'button[class*="rounded-full"]',
    'a[class*="rounded-full"]',
    '[class*="game-card"]',
    '[class*="GameCard"]',
    '[class*="game-detail"]',
    '[class*="GameDetail"]',
    '[class*="game-info"]',
    '[class*="cookie"]',
    '[class*="Cookie"]',
    '[class*="banner"]:not([class*="post"])',
    '[class*="Banner"]:not([class*="post"])',
    '[class*="badge"]',
    '[class*="Badge"]',
    "main",
    "main button",
    'main a[class*="rounded"]'
  ].join(",");
  function forceStubborn(root) {
    if (!root) return;
    const base = root.nodeType === 1 || root.nodeType === 11 ? root : document.body;
    if (!base || !base.querySelectorAll) return;
    let scopes;
    try {
      scopes = [...base.querySelectorAll(CHROME_SCOPE_SELS)];
    } catch {
      scopes = [];
    }
    if (base.matches?.(CHROME_SCOPE_SELS.split(",")[0])) scopes.unshift(base);
    try {
      for (const el of base.querySelectorAll('[class*="sticky"], [class*="Sticky"]')) {
        if (!scopes.includes(el)) scopes.push(el);
      }
    } catch {
    }
    for (const scope of scopes) {
      if (shouldSkipRoot(scope)) continue;
      try {
        const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let node;
        while (node = tw.nextNode()) {
          const parent = node.parentElement;
          if (!parent || shouldSkipRoot(parent) || parent.isContentEditable || ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"].includes(parent.tagName)) {
            continue;
          }
          if (!isChromeContext(parent)) continue;
          const raw = node.nodeValue;
          const key = normalizeKey(raw || "");
          if (!key || key.length > 120) continue;
          if (!STUBBORN.has(key)) continue;
          const next = translateText2(raw, parent);
          if (next != null && next !== raw) {
            node.nodeValue = next;
            markPill(parent);
          }
        }
      } catch {
      }
      let leaves;
      try {
        leaves = scope.querySelectorAll("span, button, a, label, li");
      } catch {
        continue;
      }
      for (const el of leaves) {
        if (shouldSkipRoot(el) || el.isContentEditable) continue;
        if (!isChromeContext(el)) continue;
        if (el.querySelector("svg, img, input, textarea, video, iframe, canvas")) continue;
        const text = normalizeKey(el.textContent || "");
        if (!text || text.length > 120 || !STUBBORN.has(text)) continue;
        const tr = translateText2(text, el);
        if (tr == null || normalizeKey(tr) === text) continue;
        if (el.childElementCount === 0) {
          el.textContent = normalizeKey(tr);
          markPill(el);
        } else {
          translateComposite(el);
          translateOwnText(el);
        }
      }
    }
  }
  function run(root = document.body || document.documentElement) {
    if (!root || busy) return;
    busy = true;
    try {
      translateNode(root);
      translateKnown(root.nodeType === 1 ? root : document.body);
      forceStubborn(root.nodeType === 1 || root.nodeType === 11 ? root : document.body);
      if (root.nodeType === 1) translatePseudos(root);
      else if (document.body) translatePseudos(document.body);
    } finally {
      busy = false;
    }
  }
  return { translateText: translateText2, translateNode, run, lookup, translatePseudos, translateKnown, forceStubborn };
}
