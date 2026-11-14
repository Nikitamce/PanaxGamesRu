import { isChromeContext, shouldSkipRoot } from "./skip.js";

export function translateTimeFragment(raw, el) {
  if (!el || shouldSkipRoot(el) || !isChromeContext(el)) return null;
  const text = clean(raw);
  if (/^is$/i.test(text)) {
    const parentText = el.parentElement?.textContent || "";
    if (/(?:сейчас|now|\d+%)|Get it|sale ends/i.test(parentText)) return "";
  }
  if (/^the$/i.test(text)) {
    const parentText = el.parentElement?.textContent || "";
    if (/(?:sale ends|до окончания скидки|before the sale)/i.test(parentText)) return "";
  }
  if (/^now$/i.test(text)) {
    const parentText = el.parentElement?.textContent || "";
    if (/(?:is now|sale ends|Get it|скидк)/i.test(parentText) && parentText.length < 200) return "\u0441\u0435\u0439\u0447\u0430\u0441";
    return null;
  }
  if (/^(?:november|ноябрь|ноября)$/i.test(text)) {
    const next = el.nextSibling?.textContent || "";
    return /^\s*\d{1,2}(?:\D|$)/.test(next) ? "\u043D\u043E\u044F\u0431\u0440\u044F" : "\u043D\u043E\u044F\u0431\u0440\u044C";
  }
  return null;
}
var MONTHS = {
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
var UNIT = {
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
var SHORT = { d: "days", h: "hours", m: "minutes", s: "seconds", w: "weeks", y: "years" };
function plural(n, forms) {
  const x = Math.abs(Number(n)) % 100;
  const d = x % 10;
  if (x > 10 && x < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}
function clean(s) {
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}
function likedTail(n, helped) {
  if (helped) return n ? `\u0438 \u0435\u0449\u0451 ${n} \u043F\u043E\u043C\u043E\u0433\u043B\u043E` : "\u0438 \u0434\u0440\u0443\u0433\u0438\u043C \u043F\u043E\u043C\u043E\u0433\u043B\u043E";
  if (!n) return "\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043E\u0446\u0435\u043D\u0438\u043B\u0438";
  const forms = ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A"];
  const nAbs = Math.abs(Number(n) || 0);
  const mod10 = nAbs % 10;
  const mod100 = nAbs % 100;
  const form = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `\u0438 \u0435\u0449\u0451 ${n} ${form} \u043E\u0446\u0435\u043D\u0438\u043B\u0438`;
}
var COUNT_FORMS = {
  like: ["\u043B\u0430\u0439\u043A", "\u043B\u0430\u0439\u043A\u0430", "\u043B\u0430\u0439\u043A\u043E\u0432"],
  comment: ["\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F", "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"],
  review: ["\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0438", "\u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439"],
  rating: ["\u043E\u0446\u0435\u043D\u043A\u0430", "\u043E\u0446\u0435\u043D\u043A\u0438", "\u043E\u0446\u0435\u043D\u043E\u043A"],
  follower: ["\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A", "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0430", "\u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432"],
  following: ["\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430", "\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438", "\u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A"]
};
export function translateCount(raw) {
  const text = clean(raw);
  const m = text.match(/^([\d.,]+)\s*([KMBkmb])?\s+(likes?|comments?|reviews?|ratings?|followers?|following)$/i);
  if (!m) return null;
  const word = m[3].toLowerCase().replace(/s$/, "").replace(/^follower$/, "follower");
  const key = word === "following" ? "following" : word;
  const forms = COUNT_FORMS[key];
  if (!forms) return null;
  const n = m[2] ? 5 : Number(m[1].replace(/,/g, ""));
  const num = `${m[1]}${m[2] || ""}`;
  return `${num} ${plural(Number.isFinite(n) ? n : 5, forms)}`;
}
function people(n) {
  return plural(n, ["\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430", "\u0447\u0435\u043B\u043E\u0432\u0435\u043A"]);
}
export function splitNotice(raw) {
  const text = clean(raw);
  if (!text || text.length > 160) return null;
  let m;
  if (/^(?:commented on|прокомментировал)\s+(?:your|ваш)\s+(?:post|пост)$/i.test(text)) return { name: "", ru: "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442" };
  if (/^(?:replied (?:on|to)|ответил на)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i.test(text)) return { name: "", ru: "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" };
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i.test(text)) return { name: "", ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" };
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:post|пост)$/i.test(text)) return { name: "", ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442" };
  if (/^(?:liked|нравится|оценил)\s+(?:your|вашу?)\s+(?:review|рецензию|обзор)$/i.test(text)) return { name: "", ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E" };
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:reply|ответ)$/i.test(text)) return { name: "", ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043E\u0442\u0432\u0435\u0442" };
  if (/^started following$/i.test(text)) return { name: "", ru: "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043B\u0441\u044F" };
  if (/^just dropped a new post$/i.test(text)) return { name: "", ru: "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B(\u0430) \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442" };
  if ((m = text.match(/^(.+?)\s+just dropped a new post$/i)) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B(\u0430) \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442" };
  }
  if (m = text.match(/^and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:post|пост)$/i)) {
    return { name: "", ru: `\u0438 \u0435\u0449\u0451 ${m[1]} ${people(m[1])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043F\u043E\u0441\u0442` };
  }
  if (m = text.match(/^and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i)) {
    return { name: "", ru: `\u0438 \u0435\u0449\u0451 ${m[1]} ${people(m[1])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439` };
  }
  if ((m = text.match(/^(.+?)\s+(?:commented on|прокомментировал)\s+(?:your|ваш)\s+(?:post|пост)$/i)) && m[1].length < 60) {
    return { name: m[1], ru: "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442" };
  }
  if ((m = text.match(/^(.+?)\s+(?:replied (?:on|to)|ответил на)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i)) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" };
  }
  if ((m = text.match(/^(.+?)\s+started following$/i)) && m[1].length < 60) {
    return { name: m[1], ru: "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043B\u0441\u044F" };
  }
  if ((m = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:post|пост)$/i)) && m[1].length < 60) {
    return { name: m[1], ru: `\u0438 \u0435\u0449\u0451 ${m[2]} ${people(m[2])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043F\u043E\u0441\u0442` };
  }
  if ((m = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i)) && m[1].length < 60) {
    return { name: m[1], ru: `\u0438 \u0435\u0449\u0451 ${m[2]} ${people(m[2])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439` };
  }
  if ((m = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:post|пост)$/i)) && !/\band\b/i.test(m[1]) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442" };
  }
  if ((m = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i)) && !/\band\b/i.test(m[1]) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" };
  }
  if ((m = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|вашу?)\s+(?:review|рецензию|обзор)$/i)) && !/\band\b/i.test(m[1]) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E" };
  }
  if ((m = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:reply|ответ)$/i)) && !/\band\b/i.test(m[1]) && m[1].length < 60) {
    return { name: m[1], ru: "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043E\u0442\u0432\u0435\u0442" };
  }
  return null;
}
export function translateNotice(raw, context = "") {
  const text = clean(raw);
  if (!text || text.length > 200) return null;
  if (/^(?:Level\s*Up!?|Уровень\s*Up!?)/i.test(text)) {
    return text.replace(/^(?:Level\s*Up!?|Уровень\s*Up!?)\s*/i, "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C! ");
  }
  if (/^Level$/i.test(text) && /(?:up!?|лвл|\d+)/i.test(context)) {
    return "\u041D\u043E\u0432\u044B\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C!";
  }
  if (/^Up!?$/i.test(text) && /(?:level|уровень|новый)/i.test(context)) {
    return "";
  }
  if (/^Check your (?:profile|Профиль|профиль) (?:to|До)?\s*see what['’]s new\.?$/i.test(text)) {
    return "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E.";
  }
  if (/^Check your$/i.test(text)) {
    return "\u0417\u0430\u0433\u043B\u044F\u043D\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439";
  }
  if (/^(?:to|До)?\s*see what['’]s new\.?$/i.test(text) || /^see what['’]s new\.?$/i.test(text)) {
    return ", \u0447\u0442\u043E\u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0447\u0442\u043E \u043D\u043E\u0432\u043E\u0433\u043E.";
  }
  if (/^log in daily to (?:level up|новый уровень!?)\s*(?:&|and)?\s*unlock avatar items!\s*streak resets daily at 3 am\.?$/i.test(text)) {
    return "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00.";
  }
  if (/^log in daily to$/i.test(text)) {
    return "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B";
  }
  if (/^(?:&|and)?\s*unlock avatar items!\s*streak resets daily at 3 am\.?$/i.test(text)) {
    return "\u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00.";
  }
  if (/^streak resets daily at 3 am\.?$/i.test(text)) {
    return "\u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00.";
  }
  if (/^just dropped a new post$/i.test(text) || /^dropped a new post$/i.test(text)) {
    return "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442";
  }
  const dropped = text.match(/^(.+?)\s+just dropped a new post$/i);
  if (dropped && dropped[1].length < 80) {
    return `${dropped[1]} \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0441\u0442`;
  }
  const saleTitle = text.match(/^(.+?)\s+(?:is now|is сейчас)\s+(\d+)%(?:\s*off)?$/i);
  if (saleTitle) {
    return `${saleTitle[1]} \u2014 \u0441\u043A\u0438\u0434\u043A\u0430 ${saleTitle[2]}%`;
  }
  const isNowOff = text.match(/^(?:is now|is сейчас)\s+(\d+)%(?:\s*off)?$/i);
  if (isNowOff) return `\u2014 \u0441\u043A\u0438\u0434\u043A\u0430 ${isNowOff[1]}%`;
  if (/^(?:is now|is сейчас)$/i.test(text)) return "\u2014 \u0441\u043A\u0438\u0434\u043A\u0430";
  const pctOff = text.match(/^(\d+)%\s*(?:off)?$/i);
  if (pctOff && /(?:is now|is сейчас|скидк|sale)/i.test(context)) return `${pctOff[1]}%`;
  const upToOff = text.match(/^up to\s+(\d+)%\s*(?:off)?$/i);
  if (upToOff) return `\u0441\u043A\u0438\u0434\u043A\u0438 \u0434\u043E ${upToOff[1]}%`;
  const savePct = text.match(/^save\s+(\d+)%$/i);
  if (savePct) return `\u0441\u043A\u0438\u0434\u043A\u0430 ${savePct[1]}%`;
  const saleBody = text.match(/^(?:Get it|Купите)?\s*(?:on|в|Вкл\.)?\s*Steam\s*(?:for|за)?\s+([^b]+?)\s*(?:before the sale ends|до окончания скидки)?\s*(?:on|в|Вкл\.)?\s*([a-zA-Zа-яА-ЯёЁ]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (saleBody) {
    const mon = MONTHS[saleBody[2].toLowerCase()] || saleBody[2];
    const day = parseInt(saleBody[3], 10);
    return `\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430 ${saleBody[1].trim()} \u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438 ${day} ${mon}${saleBody[4] ? ` ${saleBody[4]}` : ""}`;
  }
  const endsBefore = text.match(/^(?:before the sale ends|до окончания скидки)\s*(?:on|в|Вкл\.)?\s*([a-zA-Zа-яА-ЯёЁ]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (endsBefore) {
    const mon = MONTHS[endsBefore[1].toLowerCase()] || endsBefore[1];
    const day = parseInt(endsBefore[2], 10);
    return `\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438 ${day} ${mon}${endsBefore[3] ? ` ${endsBefore[3]}` : ""}`;
  }
  if (/^before the sale ends$/i.test(text) || /^before the sale ends on$/i.test(text)) {
    return "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438";
  }
  if (/^Get it on$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432";
  if (/^Steam$/i.test(text) && /Get it|Купите/i.test(context)) return "Steam";
  if (/^before the sale ends on$/i.test(text)) return "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438";
  if (/^on$/i.test(text) && /sale ends|скидк/i.test(context)) return "\u0432";
  if (/^Get it on Steam$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam";
  if (/^Get it on Steam for$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430";
  const salePrice = text.match(/^(?:for|Steam for)\s+([£€$][\d.,]+)$/i);
  if (salePrice && /(?:Get it|Steam|sale|Купите)/i.test(context)) return `\u0437\u0430 ${salePrice[1]}`;
  const salePriceWithLead = text.match(/^for\s+([£€$][\d.,]+)\s+before the sale ends on$/i);
  if (salePriceWithLead) return `\u0437\u0430 ${salePriceWithLead[1]} \u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438`;
  if (/^Steam for$/i.test(text) && /(?:Get it|sale|Купите)/i.test(context)) return "Steam \u0437\u0430";
  if (/^before the sale ends on$/i.test(text)) return "\u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438";
  if (/^for$/i.test(text) && /(?:Steam|sale|Купите)/i.test(context)) return "\u0437\u0430";
  const salePrefix = text.match(/^Get it on Steam for\s+(.+?)\s+before the sale ends on$/i);
  if (salePrefix) return `\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430 ${salePrefix[1]} \u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438`;
  const saleSuffix = text.match(/^([£€$][\d.,]+)\s+before the sale ends on(?:\s+(.+))?$/i);
  if (saleSuffix) {
    const date = saleSuffix[2] ? translateNotice(saleSuffix[2]) : "";
    if (!saleSuffix[2] || date) return `${saleSuffix[1]} \u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0441\u043A\u0438\u0434\u043A\u0438${date ? ` ${date}` : ""}`;
  }
  if (/^Get it$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435";
  if (/^Get it on Steam$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam";
  if (/^Get it on Steam for$/i.test(text)) return "\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430";
  if (/^on Steam for$/i.test(text)) return "\u0432 Steam \u0437\u0430";
  const steamFor = text.match(/^Get it on Steam for\s+(.+)$/i) || text.match(/^Steam for\s+(.+)$/i);
  if (steamFor) return `\u041A\u0443\u043F\u0438\u0442\u0435 \u0432 Steam \u0437\u0430 ${steamFor[1]}`;
  const likedGames = text.match(/^Liked\s+(\d+\+?)\s+games?$/i);
  if (likedGames) {
    return `\u041F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C ${likedGames[1]} \u0438\u0433\u0440`;
  }
  const dateMatch = text.match(/^(?:on\s+)?([a-zA-Z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (dateMatch && MONTHS[dateMatch[1].toLowerCase()]) {
    const mon = MONTHS[dateMatch[1].toLowerCase()];
    const day = parseInt(dateMatch[2], 10);
    return `${day} ${mon}${dateMatch[3] ? ` ${dateMatch[3]}` : ""}`;
  }
  if (/^updates$/i.test(text)) return "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F";
  if (/^highlights$/i.test(text)) return "\u0413\u043B\u0430\u0432\u043D\u043E\u0435";
  if (/^game chart$/i.test(text)) return "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0438\u0433\u0440";
  if (/^featured collections$/i.test(text)) return "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438";
  if (/^platforms$/i.test(text)) return "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B";
  if (/^request platforms$/i.test(text)) return "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B";
  if (/^game types$/i.test(text)) return "\u0422\u0438\u043F\u044B \u0438\u0433\u0440";
  if (/^main$/i.test(text)) return "\u041E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u0438\u0433\u0440\u0430";
  if (/^dlc & expansion$/i.test(text)) return "DLC \u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435";
  if (/^remake & remaster$/i.test(text)) return "\u0420\u0435\u043C\u0435\u0439\u043A \u0438 \u0440\u0435\u043C\u0430\u0441\u0442\u0435\u0440";
  if (/^edition & collection$/i.test(text)) return "\u0418\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u0441\u0431\u043E\u0440\u043D\u0438\u043A";
  if (/^bundle$/i.test(text)) return "\u041D\u0430\u0431\u043E\u0440";
  if (/^share profile$/i.test(text)) return "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C";
  if (/^connect playstation account$/i.test(text)) return "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442 PlayStation";
  if (/^connect xbox account$/i.test(text)) return "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442 Xbox";
  if (/^bookmarks$/i.test(text)) return "\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438";
  if (/^pin to your profile$/i.test(text)) return "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435";
  if (/^copy text$/i.test(text)) return "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442";
  if (/^unfollow this user$/i.test(text)) return "\u041E\u0442\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F";
  if (/^not enough ratings yet$/i.test(text)) return "\u041E\u0446\u0435\u043D\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E";
  if (/^edit profile$/i.test(text)) return "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C";
  if (/^tell us your thoughts on a game$/i.test(text)) return "\u0420\u0430\u0441\u0441\u043A\u0430\u0436\u0438\u0442\u0435, \u0447\u0442\u043E \u0434\u0443\u043C\u0430\u0435\u0442\u0435 \u043E\u0431 \u0438\u0433\u0440\u0435";
  if (/^follow this user$/i.test(text)) return "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F";
  if (/^unfollow this user$/i.test(text)) return "\u041E\u0442\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F";
  if (/^post$/i.test(text)) return "\u041F\u043E\u0441\u0442";
  if (/^(?:commented on|прокомментировал)\s+(?:your|ваш)\s+(?:post|пост)$/i.test(text)) return "\u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442";
  if (/^(?:replied (?:on|to)|ответил на)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i.test(text)) return "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439";
  if (/^(?:replied (?:on|to)|ответил на)\s+(?:your|ваш)$/i.test(text)) return "\u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448";
  if (/^started following$/i.test(text)) return "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043B\u0441\u044F";
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:post|пост)$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043F\u043E\u0441\u0442" : "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442";
  }
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" : "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439";
  }
  if (/^(?:liked|нравится|оценил)\s+(?:your|вашу?)\s+(?:review|рецензию|обзор)$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E" : "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448\u0443 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044E";
  }
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:reply|ответ)$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043E\u0442\u0432\u0435\u0442" : "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043E\u0442\u0432\u0435\u0442";
  }
  if (/^(?:liked|нравится|оценил)\s+(?:your|ваш)$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? "\u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448" : "\u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448";
  }
  const andLiked = text.match(/^and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:post|пост)$/i);
  if (andLiked) return `\u0438 \u0435\u0449\u0451 ${andLiked[1]} ${people(andLiked[1])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043F\u043E\u0441\u0442`;
  const andLikedComment = text.match(/^and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i);
  if (andLikedComment) return `\u0438 \u0435\u0449\u0451 ${andLikedComment[1]} ${people(andLikedComment[1])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439`;
  const nameAnd = text.match(/^(.+?)\s+and\s+(\d+)\s+others?$/i);
  if (nameAnd && nameAnd[1].length < 60) {
    return `${nameAnd[1]} \u0438 \u0435\u0449\u0451 ${nameAnd[2]} ${people(nameAnd[2])}`;
  }
  const namedComment = text.match(/^(.+?)\s+(?:commented on|прокомментировал)\s+(?:your|ваш)\s+(?:post|пост)$/i);
  if (namedComment && namedComment[1].length < 80) return `${namedComment[1]} \u043F\u0440\u043E\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442`;
  const namedReplied = text.match(/^(.+?)\s+(?:replied (?:on|to)|ответил на)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i);
  if (namedReplied && namedReplied[1].length < 80) return `${namedReplied[1]} \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439`;
  const namedLike = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:post|пост)$/i);
  if (namedLike && !/\band\b/i.test(namedLike[1]) && namedLike[1].length < 80) {
    return `${namedLike[1]} \u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043F\u043E\u0441\u0442`;
  }
  const namedLikeComment = text.match(/^(.+?)\s+(?:liked|нравится|оценил)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i);
  if (namedLikeComment && !/\band\b/i.test(namedLikeComment[1]) && namedLikeComment[1].length < 80) {
    return `${namedLikeComment[1]} \u043E\u0446\u0435\u043D\u0438\u043B \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439`;
  }
  const othersLike = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:post|пост)$/i);
  if (othersLike) {
    return `${othersLike[1]} \u0438 \u0435\u0449\u0451 ${othersLike[2]} ${people(othersLike[2])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043F\u043E\u0441\u0442`;
  }
  const othersLikeComment = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+(?:liked|нравится|оценили)\s+(?:your|ваш)\s+(?:comment|комментарий)$/i);
  if (othersLikeComment) {
    return `${othersLikeComment[1]} \u0438 \u0435\u0449\u0451 ${othersLikeComment[2]} ${people(othersLikeComment[2])} \u043E\u0446\u0435\u043D\u0438\u043B\u0438 \u0432\u0430\u0448 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439`;
  }
  const started = text.match(/^(.+?)\s+started following$/i);
  if (started && started[1].length < 60) return `${started[1]} \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043B\u0441\u044F`;
  return null;
}
export function translateActivity(raw) {
  const text = clean(raw);
  if (!text || text.length > 160) return null;
  const deleted = text.match(/^This (comment|post|review|reply) has been deleted\.?$/i);
  if (deleted) {
    const kind = deleted[1].toLowerCase();
    if (kind === "review") return "\u042D\u0442\u0430 \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0430.";
    const noun = { comment: "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", post: "\u043F\u043E\u0441\u0442", reply: "\u043E\u0442\u0432\u0435\u0442" }[kind];
    return `\u042D\u0442\u043E\u0442 ${noun} \u0443\u0434\u0430\u043B\u0451\u043D.`;
  }
  const liked = text.match(/^(?:(.+?)\s+)?and\s+(?:(\d+)\s+)?others?\s+(liked|got help)$/i);
  if (liked) {
    const who = liked[1] ? `${liked[1]} ` : "";
    return `${who}${likedTail(liked[2], /got help/i.test(liked[3]))}`;
  }
  if (/^helped$/i.test(text)) return "\u041F\u043E\u043C\u043E\u0433\u043B\u043E";
  const flair = {
    tips: "\u0421\u043E\u0432\u0435\u0442\u044B",
    ask: "\u0412\u043E\u043F\u0440\u043E\u0441",
    lfg: "\u0418\u0449\u0443 \u043F\u0430\u0442\u0438",
    flex: "\u0424\u043B\u0435\u043A\u0441",
    quiz: "\u0412\u0438\u043A\u0442\u043E\u0440\u0438\u043D\u0430",
    impressions: "\u0412\u043F\u0435\u0447\u0430\u0442\u043B\u0435\u043D\u0438\u044F",
    moments: "\u041C\u043E\u043C\u0435\u043D\u0442\u044B",
    rant: "\u041D\u0430\u043A\u0438\u043F\u0435\u043B\u043E",
    deal: "\u0421\u0434\u0435\u043B\u043A\u0430",
    "off-topic": "\u041E\u0444\u0444\u0442\u043E\u043F",
    "off topic": "\u041E\u0444\u0444\u0442\u043E\u043F",
    meme: "\u041C\u0435\u043C",
    haul: "\u041D\u0430\u0445\u043E\u0434\u043A\u0438",
    spoiler: "\u0421\u043F\u043E\u0439\u043B\u0435\u0440",
    "news flash": "\u041C\u043E\u043B\u043D\u0438\u044F",
    hide: "\u0421\u043A\u0440\u044B\u0442\u044C",
    recommend: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C",
    random: "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u043E",
    "most rated": "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u043E\u0446\u0435\u043D\u043E\u043A",
    "most reviewed": "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u0440\u0435\u0446\u0435\u043D\u0437\u0438\u0439",
    "most goty awards": "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u043D\u0430\u0433\u0440\u0430\u0434 GOTY",
    "old release": "\u0421\u0442\u0430\u0440\u044B\u0435 \u0440\u0435\u043B\u0438\u0437\u044B",
    "a-z": "\u0410\u2013\u042F",
    "z-a": "\u042F\u2013\u0410"
  }[text.toLowerCase()];
  if (flair) return flair;
  if (/^the first goal is right in front of you!$/i.test(text)) return "\u041F\u0435\u0440\u0432\u0430\u044F \u0446\u0435\u043B\u044C \u0443\u0436\u0435 \u043F\u0435\u0440\u0435\u0434 \u0442\u043E\u0431\u043E\u0439!";
  if (/^not interested in this game\??$/i.test(text)) return "\u042D\u0442\u0430 \u0438\u0433\u0440\u0430 \u043D\u0435 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0430?";
  const filters = text.match(/^filters:\s*(.+)$/i);
  if (filters && text.length < 80) return `\u0424\u0438\u043B\u044C\u0442\u0440\u044B: ${filters[1]}`;
  if (/^panax store$/i.test(text)) return "\u041C\u0430\u0433\u0430\u0437\u0438\u043D PANAX";
  if (/^no comments(?: yet)?$/i.test(text)) return "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432";
  if (/^connect with players to grab and guard badges!?$/i.test(text)) {
    return "\u041E\u0431\u0449\u0430\u0439\u0442\u0435\u0441\u044C \u0441 \u0438\u0433\u0440\u043E\u043A\u0430\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0438 \u0437\u0430\u0449\u0438\u0449\u0430\u0442\u044C \u0437\u043D\u0430\u0447\u043A\u0438!";
  }
  const joinedMatch = text.match(/^joineds+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december).?s+(d{1,2})(?:,?s*(d{4}))?$/i) || text.match(/^joineds+(d{1,2})s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december).?(?:,?s*(d{4}))?$/i);
  if (joinedMatch) {
    const isDayFirst = /^\d/.test(joinedMatch[1]);
    const monthStr = isDayFirst ? joinedMatch[2] : joinedMatch[1];
    const dayStr = isDayFirst ? joinedMatch[1] : joinedMatch[2];
    const yearStr = joinedMatch[3] ? ` ${joinedMatch[3]}` : "";
    const ruM = MONTHS[monthStr.toLowerCase()];
    if (ruM) return `\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F: ${dayStr} ${ruM}${yearStr}`;
  }
  const thoughtsOn = text.match(/^what are your thoughts on\s+(.+?)\??$/i);
  if (thoughtsOn) {
    return "\u0427\u0442\u043E \u0432\u044B \u0434\u0443\u043C\u0430\u0435\u0442\u0435 \u043E " + thoughtsOn[1].trim() + "?";
  }
  if (/^discover$/i.test(text)) return "\u041E\u0431\u0437\u043E\u0440";
  if (/^arcade$/i.test(text)) return "\u0410\u0440\u043A\u0430\u0434\u0430";
  if (/^pick an emoji[.…]{0,3}$/i.test(text)) return "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044D\u043C\u043E\u0434\u0437\u0438\u2026";
  if (/^search emoji$/i.test(text)) return "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0434\u0437\u0438";
  if (/^tell us your thoughts on a game$/i.test(text)) return "\u0420\u0430\u0441\u0441\u043A\u0430\u0436\u0438\u0442\u0435, \u0447\u0442\u043E \u0434\u0443\u043C\u0430\u0435\u0442\u0435 \u043E\u0431 \u0438\u0433\u0440\u0435";
  if (/^follow this user$/i.test(text)) return "\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F";
  if (/^unfollow this user$/i.test(text)) return "\u041E\u0442\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F";
  if (/^post$/i.test(text)) return "\u041F\u043E\u0441\u0442";
  if (/^log in daily to (?:level up|новый уровень!?)\s*(?:&|and)?\s*unlock avatar items!\s*streak resets daily at 3 am\.?$/i.test(text)) {
    return "\u0417\u0430\u0445\u043E\u0434\u0438\u0442\u0435 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0432\u044B\u0448\u0430\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B \u0430\u0432\u0430\u0442\u0430\u0440\u0430! \u0421\u0435\u0440\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0432 3:00.";
  }
  const expStreak = text.match(/^exp\s*\+\s*([\d.,]+)\s+you(?:'|’)re on an?\s+(\d+)-day streak$/i);
  if (expStreak) {
    return `\u041E\u043F\u044B\u0442 + ${expStreak[1]} \u0421\u0435\u0440\u0438\u044F: ${expStreak[2]} ${plural(expStreak[2], ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"])}`;
  }
  const streak = text.match(/^you(?:'|’)re on an?\s+(\d+)-day streak$/i);
  if (streak) return `\u0421\u0435\u0440\u0438\u044F: ${streak[1]} ${plural(streak[1], ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"])}`;
  const exp = text.match(/^exp\s*\+\s*([\d.,]+)$/i);
  if (exp) return `\u041E\u043F\u044B\u0442 + ${exp[1]}`;
  if (/what['’′]s on your mind\??\s*use\s+#+\s*to tag a game[.…]*/i.test(text) && text.length < 90) {
    return "\u041E \u0447\u0451\u043C \u0434\u0443\u043C\u0430\u0435\u0448\u044C? \u0427\u0435\u0440\u0435\u0437 ## \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0438\u0433\u0440\u0443";
  }
  const added = text.match(/^(.*?)added\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (added && text.length < 160) {
    const prefix = added[1].trim();
    const forms = UNIT[added[3].toLowerCase()];
    if (forms && prefix.length <= 80 && !/[.!?]/.test(prefix)) {
      const tail = `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E ${added[2]} ${plural(added[2], forms)} \u043D\u0430\u0437\u0430\u0434`;
      return prefix ? `${prefix} ${tail}` : tail;
    }
  }
  if (/^linked$/i.test(text)) return "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E";
  if (/^challenges$/i.test(text)) return "\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u044F";
  const addGames = text.match(/^Add games to (Backlog|Wishlist|Playing|Beaten|Paused|Quit)$/i);
  if (addGames) {
    const into = {
      backlog: "\u043F\u043B\u0430\u043D\u044B",
      wishlist: "\u0436\u0435\u043B\u0430\u0435\u043C\u043E\u0435",
      playing: "\xAB\u0418\u0433\u0440\u0430\u044E\xBB",
      beaten: "\xAB\u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043E\xBB",
      paused: "\xAB\u041F\u0430\u0443\u0437\u0430\xBB",
      quit: "\xAB\u0411\u0440\u043E\u0448\u0435\u043D\u043E\xBB"
    }[addGames[1].toLowerCase()];
    if (into) return `\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0433\u0440\u044B \u0432 ${into}`;
  }
  const profileTab = text.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?$/i);
  if (profileTab) {
    const labels = {
      posts: "\u041F\u043E\u0441\u0442\u044B",
      reviews: "\u0420\u0435\u0446\u0435\u043D\u0437\u0438\u0438",
      collections: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438",
      "following games": "\u0418\u0433\u0440\u044B \u0432 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\u0445",
      top: "\u0422\u043E\u043F"
    };
    const label = labels[profileTab[1].toLowerCase()];
    if (label) return profileTab[2] ? `${label} ${profileTab[2].replace(/\s+/g, "")}` : label;
  }
  return null;
}
export function translateTimestamp(raw) {
  const text = clean(raw);
  if (!text || text.length > 48) return null;
  const leadMatch = text.match(/^([·•∙⋅・\u2219\u22C5\u30FB.\-–—]+\s*)/);
  const lead = leadMatch ? leadMatch[1].trim() : "";
  const body = leadMatch ? text.slice(leadMatch[1].length).trim() : text;
  if (!body) return null;
  const out = stampBody(body);
  if (!out) return null;
  return lead ? `${lead} ${out}` : out;
}
function stampBody(body) {
  if (/^just now$/i.test(body)) return "\u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E";
  if (/^yesterday$/i.test(body)) return "\u0432\u0447\u0435\u0440\u0430";
  if (/^today$/i.test(body)) return "\u0441\u0435\u0433\u043E\u0434\u043D\u044F";
  if (/^tomorrow$/i.test(body)) return "\u0437\u0430\u0432\u0442\u0440\u0430";
  const compact = body.match(/^(\d+)\s*([dhmswy])\s*ago$/i);
  if (compact) {
    const forms = UNIT[SHORT[compact[2].toLowerCase()]];
    if (forms) return `${compact[1]} ${plural(compact[1], forms)} \u043D\u0430\u0437\u0430\u0434`;
  }
  const wordAgo = body.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (wordAgo) {
    const forms = UNIT[wordAgo[2].toLowerCase()];
    if (forms) return `${wordAgo[1]} ${plural(wordAgo[1], forms)} \u043D\u0430\u0437\u0430\u0434`;
  }
  const addedWords = body.match(/^added\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (addedWords) {
    const forms = UNIT[addedWords[2].toLowerCase()];
    if (forms) return `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E ${addedWords[1]} ${plural(addedWords[1], forms)} \u043D\u0430\u0437\u0430\u0434`;
  }
  const updated = body.match(/^updated\s+(\d+)\s*([dhmswy])\s*ago$/i);
  if (updated) {
    const forms = UNIT[SHORT[updated[2].toLowerCase()]];
    if (forms) return `\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E ${updated[1]} ${plural(updated[1], forms)} \u043D\u0430\u0437\u0430\u0434`;
  }
  const month = body.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i
  );
  if (month) {
    const ru = MONTHS[month[1].toLowerCase()];
    if (ru) return `${month[2]} ${ru}${month[3] ? ` ${month[3]}` : ""}`;
  }
  const dayFirst = body.match(
    /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*(\d{4}))?$/i
  );
  if (dayFirst) {
    const ru = MONTHS[dayFirst[2].toLowerCase()];
    if (ru) return `${dayFirst[1]} ${ru}${dayFirst[3] ? ` ${dayFirst[3]}` : ""}`;
  }
  return null;
}
