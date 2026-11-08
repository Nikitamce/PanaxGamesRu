import { SKIP_TAGS, shouldSkipRoot, shouldSkipProse, isChromeContext, AMBIGUOUS_SHORT } from './skip.js';
import { translateTimestamp, translateTimeFragment, translateActivity, translateCount, translateNotice, splitNotice } from './time.js';

const ATTR_OK = new Set([
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'alt',
  'data-placeholder',
]);

const MONTHS_LOWER = {
  jan: 'янв', january: 'января',
  feb: 'фев', february: 'февраля',
  mar: 'мар', march: 'марта',
  apr: 'апр', april: 'апреля',
  may: 'мая',
  jun: 'июн', june: 'июня',
  jul: 'июл', july: 'июля',
  aug: 'авг', august: 'августа',
  sep: 'сен', sept: 'сен', september: 'сентября',
  oct: 'окт', october: 'октября',
  nov: 'ноя', november: 'ноября',
  dec: 'дек', december: 'декабря',
  ноябрь: 'ноября', ноября: 'ноября', октябрь: 'октября', октября: 'октября',
};

const MONTHS_SHORT = {
  Jan: 'янв', Feb: 'фев', Mar: 'мар', Apr: 'апр', May: 'мая', Jun: 'июн',
  Jul: 'июл', Aug: 'авг', Sep: 'сен', Oct: 'окт', Nov: 'ноя', Dec: 'дек',
};

const MONTHS_FULL = {
  January: 'января', February: 'февраля', March: 'марта', April: 'апреля',
  May: 'мая', June: 'июня', July: 'июля', August: 'августа',
  September: 'сентября', October: 'октября', November: 'ноября', December: 'декабря',
};

const MONTHS_NOMINATIVE = {
  January: 'январь', February: 'февраль', March: 'март', April: 'апрель',
  May: 'май', June: 'июнь', July: 'июль', August: 'август',
  September: 'сентябрь', October: 'октябрь', November: 'ноябрь', December: 'декабрь',
};

const UNIT = {
  second: ['секунду', 'секунды', 'секунд'],
  seconds: ['секунду', 'секунды', 'секунд'],
  minute: ['минуту', 'минуты', 'минут'],
  minutes: ['минуту', 'минуты', 'минут'],
  hour: ['час', 'часа', 'часов'],
  hours: ['час', 'часа', 'часов'],
  day: ['день', 'дня', 'дней'],
  days: ['день', 'дня', 'дней'],
  week: ['неделю', 'недели', 'недель'],
  weeks: ['неделю', 'недели', 'недель'],
  month: ['месяц', 'месяца', 'месяцев'],
  months: ['месяц', 'месяца', 'месяцев'],
  year: ['год', 'года', 'лет'],
  years: ['год', 'года', 'лет'],
};

const SHORT_AGO = {
  sec: 'seconds', secs: 'seconds',
  min: 'minutes', mins: 'minutes',
  hr: 'hours', hrs: 'hours',
  mo: 'months', mos: 'months',
  yr: 'years', yrs: 'years',
};

const COUNT_WORD = {
  Likes: ['лайк', 'лайка', 'лайков'],
  Like: ['лайк', 'лайка', 'лайков'],
  Reviews: ['рецензия', 'рецензии', 'рецензий'],
  Review: ['рецензия', 'рецензии', 'рецензий'],
  Ratings: ['оценка', 'оценки', 'оценок'],
  Rating: ['оценка', 'оценки', 'оценок'],
  Games: ['игра', 'игры', 'игр'],
  Game: ['игра', 'игры', 'игр'],
  Comments: ['комментарий', 'комментария', 'комментариев'],
  Comment: ['комментарий', 'комментария', 'комментариев'],
  Followers: ['подписчик', 'подписчика', 'подписчиков'],
  Following: ['подписка', 'подписки', 'подписок'],
  Lists: ['список', 'списка', 'списков'],
  List: ['список', 'списка', 'списков'],
  Players: ['игрок', 'игрока', 'игроков'],
  Player: ['игрок', 'игрока', 'игроков'],
  Results: ['результат', 'результата', 'результатов'],
  Result: ['результат', 'результата', 'результатов'],
};

function normalizeKey(s) {
  return String(s)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2018\u2019\u02BC\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Record<string, string>} dict
 */
export function createEngine(dict) {
  /** @type {Map<string, string>} */
  const exact = new Map();
  /** @type {Map<string, string>} */
  const fold = new Map();
  const NO_FOLD = new Set(['on', 'to', 'by', 'or', 'in', 'at', 'for', 'from', 'with']);
  for (const [key, value] of Object.entries(dict)) {
    const norm = normalizeKey(key);
    if (!norm) continue;
    exact.set(norm, value);
    const lower = norm.toLowerCase();
    if (!NO_FOLD.has(lower) && !fold.has(lower)) fold.set(lower, value);
  }

  let busy = false;

  function plural(n, forms) {
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
    const num = String(n).replace(/,/g, '');
    const base = /[KMBkmb]$/.test(num) ? 5 : Number(num);
    return `${n} ${plural(Number.isFinite(base) ? base : 5, forms)}`;
  }

  function preserveEdges(raw, translated) {
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    return lead + translated + trail;
  }

  function translateText(raw, el = null) {
    if (!raw) return null;
    const stamped = translateTimestamp(raw) ?? translateTimeFragment(raw, el) ?? translateNotice(raw, el?.parentElement?.textContent || '') ?? translateActivity(raw) ?? translateCount(raw) ?? editCostume(raw, el);
    if (stamped != null && normalizeKey(stamped) !== normalizeKey(raw)) return preserveEdges(raw, stamped);
    const text = normalizeKey(raw);
    if (!text || text.length > 420) return null;
    if (el && shouldSkipProse(el, text)) {
      // Outside chrome, allow only whole UI phrases, timestamps, and
      // known section titles. Single words ("Post", "Like", "On") stay
      // untouched inside posts.
      const timeLike =
        /(?:^|[·•.\-\s])\d+\s*[dhms]\s*ago$/i.test(text) ||
        /^\d+\s+[a-z]+\s+ago$/i.test(text) ||
        /^(?:just now|yesterday|today|tomorrow)$/i.test(text) ||
        /^(?:[·•.\-\s]*)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+\d{1,2}(?:,?\s*\d{4})?$/i.test(text) ||
        /^(?:[·•.\-\s]*)?\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*\d{4})?$/i.test(text);
      const multiWord = text.includes(' ') && text.length >= 8;
      const sectionTitle = /^(Preferences|Service|Settings|Account|Language|FAQ|English|Korean|Japanese|Portuguese|Spanish|French|Lv|LV|Ratings|Collections|Collection|Reviews|Review|Posts|Impressions|Playing|Public|Private|Followers only)$/i.test(text);
      const levelLine = /\bLv\.?\s*\d+\b/i.test(text) && text.length < 80;
      const likedLine = /\band\s+(?:\d+\s+)?others?\s+(liked|got help)$/i.test(text) && text.length < 120;
      const profileLine = /^(?:[·•.\-]\s*)?(follows you|\d+\s*[dhms]\s*ago|posts\s+[\d.,]+\s*[kmb]?|follow back|\d+\s+playing|posts|reviews|collections|following games|top)(?:\s+[\d.,]+\s*[kmb]?)?$/i.test(text);
      if (!timeLike && !multiWord && !sectionTitle && !levelLine && !likedLine && !profileLine) return null;
    }

    // A bare ambiguous UI word (Save, Post, Like, …) whose neighbours are
    // English prose is a game title / user text, not a control label.
    if (el && !text.includes(' ') && AMBIGUOUS_SHORT.has(text.toLowerCase())) {
      let host = el;
      for (let i = 0; i < 3 && host.parentElement && normalizeKey(host.textContent || '') === text; i += 1) {
        host = host.parentElement;
      }
      const hostText = normalizeKey(host.textContent || '');
      if (
        hostText &&
        hostText !== text &&
        hostText.length > text.length + 2 &&
        !host.closest?.('button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], nav, header, [role="navigation"], [class*="tab-button"], select, option, label')
      ) {
        const extra = hostText
          .toLowerCase()
          .split(text.toLowerCase())
          .join(' ')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length >= 3 && w === w.toLowerCase() && /^[a-z]+$/.test(w));
        if (extra.length >= 1) return null;
      }
    }

    const hit = exact.get(text) ?? fold.get(text.toLowerCase());
    if (hit != null) return preserveEdges(raw, hit);

    const counted = text.match(
      /^([\d.,]+[KMBkmb]?)\s+(Likes|Like|Reviews|Review|Ratings|Rating|Games|Game|Comments|Comment|Followers|Following|Lists|List|Players|Player|Results|Result)$/,
    );
    if (counted) {
      const next = countRepl(counted[1], counted[2]);
      if (next) return preserveEdges(raw, next);
    }

    const showing = text.match(/^Showing\s+([\d.,]+)\s+results?$/i);
    if (showing) {
      const n = showing[1];
      const word = plural(n.replace(/,/g, ''), ['результат', 'результата', 'результатов']);
      return preserveEdges(raw, `Показано: ${n} ${word}`);
    }

    const basedOn = text.match(/^based on\s+([\d.,]+)\s+ratings?$/i);
    if (basedOn) {
      const n = basedOn[1];
      return preserveEdges(raw, `на основе ${n} ${plural(n.replace(/,/g, ''), COUNT_WORD.Ratings)}`);
    }

    const releasedOn = text.match(/^Released:\s*(.+)$/i);
    if (releasedOn) {
      const dateRaw = releasedOn[1];
      const dateTr = translateText(dateRaw);
      const dateOut = dateTr != null ? normalizeKey(dateTr) : dateRaw;
      return preserveEdges(raw, `Вышла: ${dateOut}`);
    }

    const copyright = text.match(/^(?:©|c)\s*(\d{4})\s*PANAX(?:T)?(?:,?\s*Inc\.)?\.?\s*All rights reserved\.?$/i);
    if (copyright) {
      return preserveEdges(raw, `© ${copyright[1]} PANAX, Inc. Все права защищены.`);
    }

    const levelOnly = text.match(/^Lv\.?\s*(\d+)$/i);
    if (levelOnly) return preserveEdges(raw, `Лвл ${levelOnly[1]}`);

    // "195 · Lv 74" or "· Lv 74" — only the level token, names stay as-is
    if (/\bLv\.?\s*\d+\b/i.test(text) && text.length < 80 && !/[.!?].*[.!?]/.test(text)) {
      const next = text.replace(/\bLv\.?\s*(\d+)\b/gi, 'Лвл $1');
      if (next !== text) return preserveEdges(raw, next);
    }

    const liked = text.match(/^(.+?)\s+and\s+(?:(\d+)\s+)?others?\s+(liked|got help)$/i);
    if (liked && text.length < 120) {
      const who = liked[1];
      const n = liked[2];
      const helped = /got help/i.test(liked[3]);
      const verb = helped ? null : 'оценили';
      const tail = helped
        ? (n ? `и ещё ${n} помогло` : 'и другим помогло')
        : (n ? `и ещё ${n} ${plural(n, ['человек', 'человека', 'человек'])} ${verb}` : `и другие ${verb}`);
      return preserveEdges(raw, `${who} ${tail}`);
    }

    const followsYou = text.match(/^(?:[·•.\-]\s*)?Follows you$/i);
    if (followsYou) return preserveEdges(raw, 'Подписан на вас');

    const profileTab = text.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?(?:\s*[▾▼˅])?$/i);
    if (profileTab) {
      const labels = {
        posts: 'Посты',
        reviews: 'Рецензии',
        collections: 'Коллекции',
        'following games': 'Игры в подписках',
        top: 'Топ',
      };
      const label = labels[profileTab[1].toLowerCase()];
      if (label) return preserveEdges(raw, profileTab[2] ? `${label} ${profileTab[2]}` : label);
    }

    const postsCount = text.match(/^Posts\s+(\d+)$/i);
    if (postsCount) return preserveEdges(raw, `Посты ${postsCount[1]}`);

    const playingCount = text.match(/^(\d+)\s+Playing$/i);
    if (playingCount) return preserveEdges(raw, `${playingCount[1]} играют`);

    const inlineUpdated = text.match(/^(.*?\s)?Updated\s+(\d+)\s*([dhms])\s*ago(\s.*)?$/i);
    if (inlineUpdated && text.length < 80) {
      const unit = { d: 'д', h: 'ч', m: 'мин', s: 'с' }[inlineUpdated[3].toLowerCase()] || inlineUpdated[3];
      const head = inlineUpdated[1] || '';
      const tail = inlineUpdated[4] || '';
      return preserveEdges(raw, `${head}Обновлено ${inlineUpdated[2]} ${unit} назад${tail}`);
    }

    const updatedAgo = text.match(/^Updated\s+(\d+)\s*([dhms])\s*ago$/i);
    if (updatedAgo) {
      const unit = { d: 'д', h: 'ч', m: 'мин', s: 'с' }[updatedAgo[2].toLowerCase()] || updatedAgo[2];
      return preserveEdges(raw, `Обновлено ${updatedAgo[1]} ${unit} назад`);
    }

    const updatedWords = text.match(/^Updated\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (updatedWords) {
      const forms = {
        second: ['секунду', 'секунды', 'секунд'],
        minute: ['минуту', 'минуты', 'минут'],
        hour: ['час', 'часа', 'часов'],
        day: ['день', 'дня', 'дней'],
        week: ['неделю', 'недели', 'недель'],
        month: ['месяц', 'месяца', 'месяцев'],
        year: ['год', 'года', 'лет'],
      };
      const word = forms[updatedWords[2].toLowerCase()];
      const n = updatedWords[1];
      return preserveEdges(raw, word ? `Обновлено ${n} ${plural(n, word)} назад` : `Обновлено ${n} назад`);
    }

    const MONTHS = {
      jan: 'янв', january: 'января',
      feb: 'фев', february: 'февраля',
      mar: 'мар', march: 'марта',
      apr: 'апр', april: 'апреля',
      may: 'мая',
      jun: 'июн', june: 'июня',
      jul: 'июл', july: 'июля',
      aug: 'авг', august: 'августа',
      sep: 'сен', sept: 'сен', september: 'сентября',
      oct: 'окт', october: 'октября',
      nov: 'ноя', november: 'ноября',
      dec: 'дек', december: 'декабря',
    };
    const monthDate = text.match(
      /^(?:[·•.\-]\s*)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?|(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*(\d{4}))?)$/i,
    );
    if (monthDate) {
      const mon = (monthDate[1] || monthDate[5] || '').toLowerCase();
      const day = monthDate[2] || monthDate[4];
      const year = monthDate[3] || monthDate[6] || '';
      const ruMon = MONTHS[mon];
      if (ruMon) return preserveEdges(raw, `${day} ${ruMon}${year ? ` ${year}` : ''}`);
    }
    if (/^just now$/i.test(text)) return preserveEdges(raw, 'только что');
    if (/^yesterday$/i.test(text)) return preserveEdges(raw, 'вчера');
    if (/^today$/i.test(text)) return preserveEdges(raw, 'сегодня');
    if (/^tomorrow$/i.test(text)) return preserveEdges(raw, 'завтра');

    const wordAgo = text.match(/^(?:[·•.\-]\s*)?(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (wordAgo) {
      const forms = {
        second: ['секунду', 'секунды', 'секунд'],
        minute: ['минуту', 'минуты', 'минут'],
        hour: ['час', 'часа', 'часов'],
        day: ['день', 'дня', 'дней'],
        week: ['неделю', 'недели', 'недель'],
        month: ['месяц', 'месяца', 'месяцев'],
        year: ['год', 'года', 'лет'],
      };
      return preserveEdges(raw, `${wordAgo[1]} ${plural(wordAgo[1], forms[wordAgo[2].toLowerCase()])} назад`);
    }

    const compactAgo = text.match(/^(?:[·•.\-\s]*)?(\d+)\s*([dhmswy])\s*ago$/i);
    if (compactAgo) {
      const map = { d: 'days', h: 'hours', m: 'minutes', s: 'seconds', w: 'weeks', y: 'years' };
      const unitKey = map[compactAgo[2].toLowerCase()];
      if (unitKey) {
        return preserveEdges(raw, `${compactAgo[1]} ${plural(compactAgo[1], UNIT[unitKey])} назад`);
      }
    }

    const seeAllCount = text.match(/^See all\s+([\d.,]+)$/i);
    if (seeAllCount) return preserveEdges(raw, `Смотреть все (${seeAllCount[1]})`);

    const filtersCount = text.match(/^Filters\s*\(([\d.,]+)\)$/i);
    if (filtersCount) return preserveEdges(raw, `Фильтры (${filtersCount[1]})`);

    const seeResults = text.match(/^See\s+([\d.,]+)\s+results?$/i);
    if (seeResults) {
      const n = seeResults[1];
      return preserveEdges(
        raw,
        `Смотреть ${n} ${plural(n.replace(/,/g, ''), COUNT_WORD.Results)}`,
      );
    }

    const ago = text.match(/^(\d+)\s+([a-z]+)\s+ago$/i);
    if (ago) {
      const key = UNIT[ago[2].toLowerCase()]
        ? ago[2].toLowerCase()
        : SHORT_AGO[ago[2].toLowerCase()];
      if (key && UNIT[key]) {
        return preserveEdges(raw, `${ago[1]} ${plural(ago[1], UNIT[key])} назад`);
      }
    }

    const oneAgo = text.match(/^(?:an?|a)\s+(second|minute|hour|day|week|month|year)\s+ago$/i);
    if (oneAgo) {
      const name = oneAgo[1].toLowerCase();
      return preserveEdges(raw, `1 ${plural(1, UNIT[name] || UNIT[`${name}s`])} назад`);
    }

    if (/^just now$/i.test(text)) return preserveEdges(raw, 'только что');

    const month = text.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,)?(?:\s+(\d{4}))?$/,
    );
    if (month) {
      return preserveEdges(
        raw,
        `${month[2]} ${MONTHS_SHORT[month[1]]}${month[3] ? ` ${month[3]}` : ''}`,
      );
    }

    const monthLong = text.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/,
    );
    if (monthLong) {
      return preserveEdges(
        raw,
        `${monthLong[2]} ${MONTHS_FULL[monthLong[1]]} ${monthLong[3]}`,
      );
    }

    const namedMonth = text.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})$/,
    );
    if (namedMonth) {
      return preserveEdges(
        raw,
        `${MONTHS_NOMINATIVE[namedMonth[1]]} ${namedMonth[2]}`,
      );
    }

    if (/^[‹«<]\s*Prev$/i.test(text)) return preserveEdges(raw, '‹ Назад');
    if (/^Next\s*[›»>]$/i.test(text)) return preserveEdges(raw, 'Далее ›');
    if (/^Prev$/i.test(text)) return preserveEdges(raw, 'Назад');
    if (/^Next$/i.test(text)) return preserveEdges(raw, 'Далее');

    // "Platform (3)" / "Filters (2)" / "Genre▼"
    const withCount = text.match(/^(.+?)\s*\(([\d.,]+)\)$/);
    if (withCount) {
      const head = lookup(withCount[1]) ?? fold.get(withCount[1].toLowerCase());
      if (head) return preserveEdges(raw, `${head} (${withCount[2]})`);
    }
    const withArrow = text.match(/^(.+?)\s*[\u25BC\u25BE\u25B2\u25B8\u2304▼▲›‹>]+$/);
    if (withArrow) {
      const head = lookup(withArrow[1]) ?? fold.get(withArrow[1].toLowerCase());
      if (head) {
        const suffix = text.slice(withArrow[1].length);
        return preserveEdges(raw, head + suffix);
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
      // Skip alt that looks like a game title (long proper-case phrase).
      if (name === 'alt' && value.length > 40) continue;
      const next = translateText(value);
      if (next != null && next.trim() !== value) {
        el.setAttribute(attr.name, next.trim());
      }
    }
    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        const next = translateText(el.value);
        if (next != null && next !== el.value) el.value = next.trim();
      }
    }
  }

  const PHRASING = new Set([
    'SPAN', 'SVG', 'IMG', 'I', 'B', 'STRONG', 'EM', 'SMALL', 'PATH', 'BR', 'WBR',
    'FONT', 'U', 'S', 'MARK', 'ABBR', 'TIME', 'SUB', 'SUP', 'DIV',
  ]);

  const LABEL_TAGS = new Set([
    'A', 'BUTTON', 'SPAN', 'LABEL', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'LI', 'DIV', 'TD', 'TH', 'DT', 'DD', 'LEGEND', 'SUMMARY', 'OPTION', 'TEXT', 'TSPAN',
  ]);

  const PILL_HINT = /rounded-full|min-w-\[|game-follow|pill|chip|badge|tab/i;

  function lookup(text) {
    return exact.get(text) ?? fold.get(text.toLowerCase()) ?? null;
  }

  function markPill(el) {
    if (!el || el.nodeType !== 1) return;
    const cls = el.className && String(el.className);
    const host = el.closest?.('button, a, [role="button"]') || el;
    const label = normalizeKey(host.textContent || '');
    const inBar = host.closest?.('header, nav, .tab-button-container, [class*="tab-button-container"]');
    const wideLabel = /^(?:follow back|подписаться в ответ|edit profile|редактировать профиль|share profile|поделиться профилем|connect playstation account|connect xbox account|подключить аккаунт playstation|подключить аккаунт xbox)$/i.test(label);
    if (wideLabel && !inBar && host.tagName !== 'BODY' && host.tagName !== 'HTML') {
      host.setAttribute('data-panax-ru', 'wide');
    }
    if (cls && PILL_HINT.test(cls)) el.setAttribute('data-panax-ru', 'pill');
    else if (!el.hasAttribute('data-panax-ru')) el.setAttribute('data-panax-ru', '1');
  }

  /**
   * Rewrite an element whose full textContent matches a dictionary entry.
   * Handles letter-split spans and icon+label buttons used by the Next.js UI.
   */
  /** Direct text nodes only (ignores nested badge/count spans). */
  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.nodeValue;
    }
    return normalizeKey(s);
  }

  function translateOwnText(el) {
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3);
    if (!texts.length) return false;

    const joined = texts.map((n) => n.nodeValue).join('');
    // Keep fragments on their original side of styled prices, dates and links.
    const fragmentedNotice = el.childElementCount > 0 && /Get it|sale ends|Check your|Загляните/.test(el.textContent || '');
    const next = fragmentedNotice ? null : translateText(joined, el);
    if (next != null && normalizeKey(next) !== normalizeKey(joined)) {
      texts[0].nodeValue = next;
      for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = '';
      markPill(el);
      return true;
    }

    let changed = false;
    for (const n of texts) {
      const tr = translateText(n.nodeValue, el);
      if (tr != null && tr !== n.nodeValue) {
        n.nodeValue = tr;
        changed = true;
      }
    }
    if (changed) markPill(el);
    return changed;
  }

  /**
   * Safe composite: never wipe icon wrappers (div>svg / img).
   * Only rewrite when every element child is a letter-split span (no graphics).
   */
  function translateComposite(el) {
    if (!el || el.nodeType !== 1 || !LABEL_TAGS.has(el.tagName)) return false;
    if (el.isContentEditable || shouldSkipRoot(el)) return false;
    if (el.tagName === 'SVG' || el.tagName === 'IMG' || el.tagName === 'PATH') return false;
    if (el.childElementCount > 40) return false;
    if (el.querySelector('input, textarea, select, video, iframe, canvas, svg, img')) {
      // Has graphics — only touch direct text / .label children, never textContent wipe
      translateOwnText(el);
      return false;
    }

    translateOwnText(el);

    const kids = [...el.children];
    // Letter-split only: spans/fonts with ≤1 char each, no div/icon wrappers
    const letterSplit =
      kids.length > 1 &&
      kids.every(
        (c) =>
          (c.tagName === 'SPAN' || c.tagName === 'FONT' || c.tagName === 'B' || c.tagName === 'I') &&
          !c.querySelector('svg, img') &&
          normalizeKey(c.textContent || '').length <= 1,
      );

    if (!letterSplit) return false;

    const text = normalizeKey(el.textContent || '');
    if (!text || text.length < 2 || text.length > 160) return false;

    if (shouldSkipProse(el, text)) return false;

    let hit = lookup(text);
    if (hit == null) {
      const flex = translateText(text, el);
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
    pseudoStyle = document.getElementById('panax-ru-pseudo');
    if (!pseudoStyle) {
      pseudoStyle = document.createElement('style');
      pseudoStyle.id = 'panax-ru-pseudo';
      (document.head || document.documentElement).appendChild(pseudoStyle);
    }
    pseudoStyle.textContent = [
      '.panax-ru-before::before { content: attr(data-panax-before) !important; }',
      '.panax-ru-after::after { content: attr(data-panax-after) !important; }',
    ].join('\n');
    return pseudoStyle;
  }

  function translatePseudos(root) {
    if (!root || root.nodeType !== 1) return;
    ensurePseudoStyle();
    const nodes = root.querySelectorAll('a, button, span, div, label, p, i, em, small, li, h1, h2, h3, h4');
    for (const el of nodes) {
      if (shouldSkipRoot(el)) continue;
      if (normalizeKey(el.textContent || '').length > 64) continue;
      for (const side of ['::before', '::after']) {
        let content = '';
        try {
          content = getComputedStyle(el, side).content;
        } catch {
          continue;
        }
        const clean = String(content || '')
          .replace(/^["']|["']$/g, '')
          .trim();
        if (!clean || clean === 'none' || clean === 'normal') continue;
        const translated = translateText(clean);
        if (translated == null) continue;
        const next = translated.trim();
        if (!next || next === clean) continue;
        if (side === '::before') {
          el.setAttribute('data-panax-before', next);
          el.classList.add('panax-ru-before');
        } else {
          el.setAttribute('data-panax-after', next);
          el.classList.add('panax-ru-after');
        }
      }
    }
  }

  function paintNotice(el) {
    if (!el || el.nodeType !== 1 || el.childElementCount > 40) return false;

    // Direct multi-node notification fixes (Level Up, Sales, Profile hint, new posts, reply/like on comments/posts)
    const rawText = el.textContent || '';
    if (/(?:Level\s*Up|Уровень\s*Up|Log in daily|Check your|is now|is сейчас|Get it|sale ends|до окончания|just dropped a new post|replied\s+(?:on|to)\s+your|(?:liked|нравится)\s+your|commented\s+on\s+your)/i.test(rawText)) {
      const nodes = [el, ...el.querySelectorAll('p, div, span, a, li, h2, h3, h4')];

      // Translate sale fragments using the complete notice as context; individual
      // styled wrappers may contain only "for $12.49" or the sale date.
      for (const p of nodes) {
        const context = normalizeKey(p.textContent || '');
        if (!/Get it/i.test(context) || !/sale ends/i.test(context) || context.length > 220) continue;
        const walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walk.nextNode())) {
          const raw = textNode.nodeValue;
          const translated = translateNotice(raw, context);
          if (translated == null) continue;
          const next = preserveEdges(raw, translated);
          if (next !== raw) textNode.nodeValue = next;
        }
      }

      // 0. Reply / like / comment on your comment / post / review
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || '');
        const isNotice =
          /(?:replied (?:on|to)|liked|нравится|commented on)\s+your/i.test(t) ||
          /оценил(?:и)?ваш|ответилнаваш|прокомментировалваш|нравитсяваш|ваш(?:комментарий|пост|ответ)|вашурецензию/i.test(t);
        if (!isNotice || t.length >= 160) continue;
        const verb = /others?\s+(?:liked|нравится|оценили|оценил)/i.test(t) ? 'оценили' : 'оценил';
        const people = (num) => plural(Number(num), ['человек', 'человека', 'человек']);
        for (const n of p.childNodes) {
          if (n.nodeType === 3) {
            const next = n.nodeValue
              // glued runs from earlier passes: restore word spacing first
              .replace(/оценилваш/gi, `${verb} ваш`)
              .replace(/оцениливаш/gi, 'оценили ваш')
              .replace(/нравитсяваш/gi, `${verb} ваш`)
              .replace(/ответилнаваш/gi, 'ответил на ваш')
              .replace(/прокомментировалваш/gi, 'прокомментировал ваш')
              .replace(/вашурецензию/gi, 'вашу рецензию')
              .replace(/ваш(?:комментарий|пост|ответ)/gi, (m) => ({ 'вашкомментарий': 'ваш комментарий', 'вашпост': 'ваш пост', 'вашответ': 'ваш ответ' }[m.toLowerCase()] || m))
              .replace(/replied (?:on|to) your (?:comment|комментарий)/gi, 'ответил на ваш комментарий')
              .replace(/replied (?:on|to) your/gi, 'ответил на ваш')
              .replace(/(?:liked|нравится) your (?:comment|комментарий)/gi, `${verb} ваш комментарий`)
              .replace(/(?:liked|нравится) your (?:post|пост)/gi, `${verb} ваш пост`)
              .replace(/(?:liked|нравится) your (?:review|рецензию|обзор)/gi, `${verb} вашу рецензию`)
              .replace(/(?:liked|нравится) your/gi, `${verb} ваш`)
              .replace(/commented on your (?:post|пост)/gi, 'прокомментировал ваш пост')
              .replace(/commented on your/gi, 'прокомментировал ваш')
              // fragments whose "your ..." lives in a sibling node
              .replace(/replied (?:on|to)(?=\s|$)/gi, 'ответил на')
              .replace(/commented on(?=\s|$)/gi, 'прокомментировал')
              .replace(/\b(?:and|&)\s+(\d+)\s+others?\b/gi, (s, num) => `и ещё ${num} ${people(num)}`)
              .replace(/\bYou(?=\s+(?:and|&|и)(?:\s|$))/g, 'Вы');
            if (next !== n.nodeValue) n.nodeValue = next;
          }
        }
        for (const cLink of p.querySelectorAll('a, span')) {
          if (cLink.childElementCount > 0) continue;
          const raw = cLink.textContent || '';
          const cText = normalizeKey(raw);
          let ru = null;
          if (/^(?:comment|Комментарий)$/i.test(cText)) ru = 'комментарий';
          else if (/^(?:post|Пост)$/i.test(cText)) ru = 'пост';
          else if (/^(?:liked|Нравится)$/i.test(cText)) ru = verb;
          else if (/^your$/i.test(cText)) ru = 'ваш';
          if (!ru) continue;
          // keep edge whitespace: spans often carry it ("your ") and losing it glues words
          const lead = raw.match(/^\s*/)[0];
          const trail = raw.match(/\s*$/)[0];
          const next = lead + ru + trail;
          if (next !== raw) {
            // Preserve text nodes referenced by React.
            const texts = [...cLink.childNodes].filter((n) => n.nodeType === 3);
            if (texts.length) {
              if (texts[0].nodeValue !== next) texts[0].nodeValue = next;
              for (const n of texts.slice(1)) if (n.nodeValue !== '') n.nodeValue = '';
            }
          }
        }
      }

      // 0.1. AjFletch27 just dropped a new post
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || '');
        if (/just dropped a new post/i.test(t) && t.length < 160) {
          for (const n of p.childNodes) {
            if (n.nodeType === 3 && /just dropped a new post/i.test(n.nodeValue)) {
              n.nodeValue = n.nodeValue.replace(/just dropped a new post/gi, 'опубликовал новый пост');
            }
          }
        }
      }

      // 0.15. Log in daily to level up unlock avatar items! Streak resets daily at 3 AM.
      for (const p of nodes) {
        if (p.querySelector('img, svg, div, p')) continue;
        const t = normalizeKey(p.textContent || '');
        if (/^log in daily to (?:level up|новый уровень!?)\s*(?:&|and)?\s*unlock avatar items!\s*streak resets daily at 3 am\.?$/i.test(t)) {
          p.textContent = 'Заходите каждый день, чтобы повышать уровень и открывать предметы аватара! Серия сбрасывается каждый день в 3:00.';
        }
      }

      // 0.2. Level Up! -> Новый уровень! (only when followed by ! or Lv/Лвл, never inside "Log in daily to level up")
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || '');
        if (!/log in daily/i.test(t) && (/(?:Level\s*Up!|Уровень\s*Up!)/i.test(t) || (/(?:Level\s*Up|Уровень\s*Up)/i.test(t) && /\b(?:Lv|Лвл)\.?\s*\d+/i.test(t)))) {
          for (const n of p.childNodes) {
            if (n.nodeType === 3 && /(?:Level\s*Up!?|Уровень\s*Up!?)/i.test(n.nodeValue)) {
              n.nodeValue = n.nodeValue.replace(/(?:Level\s*Up!?|Уровень\s*Up!?)\s*/gi, 'Новый уровень! ');
            }
          }
        }
      }

      // 1. Check your profile to see what's new (supports word-by-word span splitting)
      for (const p of nodes) {
        if (p.querySelector('img, svg, div, p')) continue;
        const t = normalizeKey(p.textContent || '');
        if (/^Check your\s+(?:profile|профиль|Профиль)\s+(?:to|До)?\s*see what['’]s new\.?$/i.test(t)) {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          let tn;
          while ((tn = walker.nextNode())) textNodes.push(tn);
          let leadDone = false;
          let tailDone = false;
          for (const node of textNodes) {
            const raw = node.nodeValue;
            const norm = normalizeKey(raw).toLowerCase();
            if (!norm) continue;
            if (/^(?:check your|check|your)$/i.test(norm)) {
              if (!leadDone) {
                node.nodeValue = preserveEdges(raw, 'Загляните в свой');
                leadDone = true;
              } else {
                node.nodeValue = '';
              }
            } else if (/^(?:profile|профиль)$/i.test(norm)) {
              node.nodeValue = preserveEdges(raw, 'профиль');
            } else if (/^(?:to|see|what's|what|s|new|new\.)$/i.test(norm) || /(?:to|До)?\s*see what/i.test(norm)) {
              if (!tailDone) {
                node.nodeValue = preserveEdges(raw, ', чтобы узнать, что нового.');
                tailDone = true;
              } else {
                node.nodeValue = '';
              }
            }
          }
        }
      }

      // 2. <Game> is now <N>% (handles word-by-word spans: <span>is </span><span>сейчас </span>)
      for (const p of nodes) {
        const t = normalizeKey(p.textContent || '');
        if (/\b(?:is\s+now|is\s+сейчас|is)\s+(?:now\s+|сейчас\s+)?\d+%/i.test(t) && t.length < 220) {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          let tn;
          while ((tn = walker.nextNode())) {
            if (tn.nodeValue && tn.nodeValue.trim()) textNodes.push(tn);
          }
          let placedBadge = false;
          for (let i = 0; i < textNodes.length; i += 1) {
            const node = textNodes[i];
            const val = node.nodeValue;
            const cleanVal = val.trim().toLowerCase();
            if (cleanVal === 'is') {
              node.nodeValue = preserveEdges(val, '— скидка');
              placedBadge = true;
              const nextNode = textNodes[i + 1];
              if (nextNode && /^(?:now|сейчас)$/i.test(nextNode.nodeValue.trim())) {
                nextNode.nodeValue = '';
              }
            } else if (cleanVal === 'now' || cleanVal === 'сейчас') {
              if (!placedBadge) {
                node.nodeValue = preserveEdges(val, '— скидка');
                placedBadge = true;
              } else {
                node.nodeValue = '';
              }
            } else if (/\b(?:is\s+now|is\s+сейчас)\b/i.test(val)) {
              node.nodeValue = val
                .replace(/\b(?:is\s+now|is\s+сейчас)\s+(\d+)%(?:\s*off)?/gi, '— скидка $1%')
                .replace(/\b(?:is\s+now|is\s+сейчас)\b/gi, '— скидка');
            }
          }
        }
      }

      // 3. Get it on Steam for $X before the sale ends on Month Day (supports word-by-word span splitting)
      for (const p of nodes) {
        if (p.querySelector('img, svg, div, p')) continue;
        const t = normalizeKey(p.textContent || '');
        if (t.length > 180 || /\b(is now|is сейчас)\b|— скидка/i.test(t)) continue;
        if (/Get it|before the sale|Купите в Steam|до окончания скидки/i.test(t)) {
          const m = t.match(/^(?:Get it|Купите)?\s*(?:on|в|Вкл\.)?\s*Steam\s*(?:for|за)?\s+([\s\S]+?)\s*(?:before the sale ends|before\s+(?:the\s+)?sale\s+ends|до окончания скидки)?\s*(?:on|в|Вкл\.)?\s*([a-zA-Zа-яА-ЯёЁ]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?\.?$/i);
          if (m) {
            const monKey = m[2].toLowerCase();
            const mon = MONTHS_LOWER[monKey] || MONTHS_FULL[monKey] || MONTHS_SHORT[monKey] || m[2];
            const day = parseInt(m[3], 10);
            const year = m[4] ? ` ${m[4]}` : '';
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            let tn;
            while ((tn = walker.nextNode())) textNodes.push(tn);

            let buyDone = false;
            let endsDone = false;
            let dateDone = false;

            for (const node of textNodes) {
              const raw = node.nodeValue;
              const norm = normalizeKey(raw).toLowerCase();
              if (!norm) continue;

              // 1. "Get", "it", "on", "в", "купите", "купите в"
              if (/^(?:get it|get|it|on|купите|купите в)$/i.test(norm) || (norm === 'в' && !endsDone)) {
                if (!buyDone) {
                  node.nodeValue = preserveEdges(raw, 'Купите в');
                  buyDone = true;
                } else {
                  node.nodeValue = '';
                }
              }
              // 2. Steam link or text - leave untouched
              else if (/^steam$/i.test(norm)) {
                // leave untouched
              }
              // 3. Price "for", "за", "$X"
              else if (/^for$/i.test(norm)) {
                node.nodeValue = preserveEdges(raw, 'за');
              }
              // 4. "before the sale ends", "before", "the", "sale", "ends", "on", "в"
              else if (/^(?:before the sale ends|before|the|sale|ends|before the sale ends on)$/i.test(norm)) {
                if (!endsDone) {
                  node.nodeValue = preserveEdges(raw, 'до окончания скидки');
                  endsDone = true;
                } else {
                  node.nodeValue = '';
                }
              } else if (norm === 'on' || (norm === 'в' && endsDone)) {
                node.nodeValue = '';
              }
              // 5. Month and Day
              else if (MONTHS_LOWER[norm] || /^(?:november|ноябрь|ноября|december|декабрь|декабря|october|октябрь|октября)$/i.test(norm)) {
                if (!dateDone) {
                  node.nodeValue = preserveEdges(raw, `${day} ${mon}${year}`);
                  dateDone = true;
                } else {
                  node.nodeValue = '';
                }
              } else if (/^\d{1,2}$/.test(norm)) {
                if (dateDone) {
                  node.nodeValue = '';
                } else {
                  node.nodeValue = preserveEdges(raw, String(day));
                }
              }
            }
          }
        }
      }
    }

    let acc = '';
    const headerNodes = [];
    const take = (node) => {
      if (node.nodeType === 3) {
        if (normalizeKey(node.nodeValue || '')) headerNodes.push(node);
        acc += node.nodeValue || '';
        return;
      }
      if (node.nodeType !== 1) return;
      if (['IMG', 'SVG', 'TIME', 'VIDEO'].includes(node.tagName)) return;
      const t = normalizeKey(node.textContent || '');
      if (t.length > 100 && !/commented on|replied (?:on|to)|(?:liked|нравится)\s+(?:your|ваш)|started following/i.test(t)) return;
      for (const child of node.childNodes) take(child);
    };
    for (const child of el.childNodes) {
      const before = normalizeKey(acc);
      take(child);
      if (splitNotice(normalizeKey(acc))) break;
      if (normalizeKey(acc) === before && child.nodeType === 1 && normalizeKey(child.textContent || '').length > 40) break;
    }
    const parsed = splitNotice(normalizeKey(acc));
    if (!parsed) return false;
    const name = parsed.name.toLowerCase();
    const actionNodes = headerNodes.filter((n) => {
      const own = normalizeKey(n.nodeValue || '').toLowerCase();
      if (!own) return false;
      if (name && own === name) return false;
      const parentText = normalizeKey(n.parentElement?.textContent || '').toLowerCase();
      if (name && parentText === name) return false;
      return true;
    });
    if (!actionNodes.length) return false;
    const own = normalizeKey(actionNodes[0].nodeValue || '').toLowerCase();
    const lead = (actionNodes[0].nodeValue.match(/^\s*/) || [''])[0];
    const next = name && own.startsWith(name) ? `${parsed.name} ${parsed.ru}` : `${lead}${parsed.ru}`;
    if (actionNodes[0].nodeValue !== next) actionNodes[0].nodeValue = next;
    for (let i = 1; i < actionNodes.length; i += 1) {
      if (actionNodes[i].nodeValue !== '') actionNodes[i].nodeValue = '';
    }
    return true;
  }

  function stampComposer(node) {
    if (!node || node.nodeType !== 1) return;
    for (const attr of ['placeholder', 'data-placeholder', 'aria-placeholder', 'aria-label']) {
      const ph = node.getAttribute(attr);
      if (!ph) continue;
      const next = translateActivity(ph);
      if (next && normalizeKey(next) !== normalizeKey(ph)) node.setAttribute(attr, next);
    }
    const visit = (el) => {
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          const prompt = translateActivity(child.nodeValue);
          if (prompt && /отметить игру|Выберите эмодзи/.test(prompt)) {
            child.nodeValue = preserveEdges(child.nodeValue, prompt);
          }
        } else if (child.nodeType === 1) {
          const prompt = translateActivity(child.textContent || '');
          if (prompt && /отметить игру/.test(prompt) && !child.querySelector('img, svg')) child.textContent = prompt;
          else visit(child);
        }
      }
    };
    visit(node);
  }

  const EDITOR_LABELS = {
    edit: 'Изменить',
    exit: 'Выйти',
    colors: 'Цвета',
    hair: 'Волосы',
    beard: 'Борода',
    shape: 'Форма',
    brows: 'Брови',
    eyes: 'Глаза',
    nose: 'Нос',
    mouth: 'Рот',
    top: 'Верх',
    bottom: 'Низ',
    shoes: 'Обувь',
    glasses: 'Очки',
    cap: 'Кепка',
    age: 'Возраст',
    makeup: 'Макияж',
    paint: 'Краска',
    scar: 'Шрам',
    spot: 'Пятно',
    pose: 'Поза',
    custom: 'Своё',
  };

  function editCostume(raw, el) {
    const host = el?.closest?.('.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]');
    if (!host) return null;
    return EDITOR_LABELS[normalizeKey(raw).toLowerCase()] || null;
  }

  function moreButton(node) {
    if (!node || node.nodeType !== 3) return null;
    const parent = node.parentElement;
    if (!parent?.classList?.contains('more-button-inline') && !parent?.closest?.('.more-button-inline')) return null;
    if (!/^more$/i.test(normalizeKey(node.nodeValue || ''))) return null;
    return 'Ещё';
  }

  /** Dates and short badges inside post cards. Full string only, no icon wipe. */
  function walkTimestamps(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      const stamped = translateTimestamp(node.nodeValue) ?? translateNotice(node.nodeValue, node.parentElement?.textContent || '') ?? translateActivity(node.nodeValue) ?? translateCount(node.nodeValue) ?? editCostume(node.nodeValue, node.parentElement) ?? moreButton(node);
      if (stamped != null && normalizeKey(stamped) !== normalizeKey(node.nodeValue)) {
        node.nodeValue = preserveEdges(node.nodeValue, stamped);
      }
      return;
    }
    if (node.nodeType === 11) {
      for (const child of node.childNodes) walkTimestamps(child);
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.tagName === 'TEXTAREA' || node.isContentEditable) {
      stampComposer(node);
      return;
    }
    for (const attr of ['placeholder', 'title', 'aria-label', 'data-placeholder']) {
      const ph = node.getAttribute?.(attr);
      if (!ph) continue;
      const nextPh = translateActivity(ph);
      if (nextPh && normalizeKey(nextPh) !== normalizeKey(ph)) node.setAttribute(attr, nextPh);
    }
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(node.tagName)) return;
    paintNotice(node);
    const graphic = node.querySelector?.('svg, img, input, textarea, video, canvas');
    const text = normalizeKey(node.textContent || '');
    if (!graphic && text.length >= 2 && text.length <= 32 && node.childElementCount <= 6) {
      const stamped = translateTimestamp(text);
      if (stamped != null && normalizeKey(stamped) !== text) {
        const texts = [...node.childNodes].filter((n) => n.nodeType === 3);
        if (texts.length && node.childElementCount === 0) {
          texts[0].nodeValue = stamped;
          for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = '';
          return;
        }
        if (node.childElementCount > 0 && [...node.children].every((c) => normalizeKey(c.textContent || '').length <= 16)) {
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
        if (
          parent &&
          (shouldSkipRoot(parent) ||
            ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(parent.tagName))
        ) {
          const stamped = translateTimestamp(node.nodeValue) ?? translateNotice(node.nodeValue, node.parentElement?.textContent || '') ?? translateActivity(node.nodeValue) ?? translateCount(node.nodeValue) ?? editCostume(node.nodeValue, node.parentElement) ?? moreButton(node);
          if (stamped != null && normalizeKey(stamped) !== normalizeKey(node.nodeValue)) {
            node.nodeValue = preserveEdges(node.nodeValue, stamped);
          }
          return;
        }
        const next = translateText(node.nodeValue, parent);
        if (next != null && next !== node.nodeValue) {
          node.nodeValue = next;
          if (parent) markPill(parent);
        }
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === 'TEXTAREA' || node.isContentEditable) {
        stampComposer(node);
        return;
      }
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'CANVAS'].includes(node.tagName)) {
        return;
      }
      if (shouldSkipRoot(node)) {
        walkTimestamps(node);
        return;
      }
      if (/^(?:follow back|подписаться в ответ|edit profile|редактировать профиль|share profile|поделиться профилем|connect playstation account|connect xbox account|подключить аккаунт playstation|подключить аккаунт xbox)$/i.test(normalizeKey(node.textContent || ''))) markPill(node);
      paintNotice(node);
      translateAttrs(node);
      if (node.childElementCount > 0 && node.childElementCount <= 4 && !node.querySelector('svg, img, input, textarea')) {
        const joined = normalizeKey(node.textContent || '');
        const stamped = joined.length <= 32 ? translateTimestamp(joined) : null;
        if (
          stamped != null &&
          normalizeKey(stamped) !== joined &&
          [...node.children].every((c) => normalizeKey(c.textContent || '').length <= 16)
        ) {
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
      /* one bad node must not abort the whole walk */
    }
  }

  /**
   * Translate leaf text holders inside a control (icon+label safe).
   * Never assigns textContent on nodes that wrap svg/img.
   */
  function translateLeafLabels(el) {
    if (!el || el.nodeType !== 1) return;
    translateOwnText(el);

    const label = el.querySelector?.(':scope > span.label, :scope > .label, span.label, .label');
    if (label && !label.querySelector('svg, img')) {
      if (label.childElementCount === 0) {
        const text = normalizeKey(label.textContent || '');
        const tr = text ? translateText(text, label) : null;
        if (tr != null && normalizeKey(tr) !== text) {
          label.textContent = normalizeKey(tr);
          markPill(label);
          label.setAttribute('data-panax-ru', 'label');
        }
      } else {
        translateOwnText(label);
        translateComposite(label);
      }
    }

    // Leaf spans/divs with only a text node (typical CTA label next to svg)
    let leaves;
    try {
      leaves = el.querySelectorAll('span, div, p, a, button, li');
    } catch {
      return;
    }
    for (const leaf of leaves) {
      if (shouldSkipRoot(leaf)) continue;
      if (leaf.querySelector('svg, img, input, textarea')) continue;
      if (leaf.childElementCount > 0) {
        translateOwnText(leaf);
        translateComposite(leaf);
        continue;
      }
      const text = normalizeKey(leaf.textContent || '');
      if (!text || text.length > 80) continue;
      const tr = translateText(text, leaf);
      if (tr != null && normalizeKey(tr) !== text) {
        leaf.textContent = normalizeKey(tr);
        markPill(leaf);
      }
    }
  }

  /**
   * Hard-target known chrome: translate text nodes and .label spans only.
   * Never assign textContent on icon+label buttons (destroys SVG wrappers).
   */
  function translateKnown(root) {
    if (!root || root.querySelectorAll == null) return;
    const sels = [
      'button.tab-button',
      '.tab-button:is(button, a, [role="tab"])',
      '.game-follow-round-button',
      // Live DOM: <p class="tab-button-label">Following</p>
      'p.tab-button-label',
      '.tab-button-label',
      'button.tab-button p',
      'button[class*="rounded-full"]',
      'a[class*="rounded-full"]',
      'span.label',
      '.label',
      // Card CTAs — only in main/cards, not every link in a post
      'main button[class*="rounded"]',
      '[class*="game-card"] button',
      '[class*="GameCard"] button',
      'article button[class*="rounded-full"]',
    ];
    const seen = new Set();
    for (const sel of sels) {
      let list;
      try {
        list = root.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of list) {
        if (seen.has(el) || shouldSkipRoot(el)) continue;
        seen.add(el);
        translateLeafLabels(el);
      }
    }
  }

  /**
   * Stubborn chrome that React restores often (feed tabs, card badges, CTAs).
   * Only inside chrome contexts — never walk post bodies.
   */
  const STUBBORN = new Set(
    [
      'Hot', 'New', 'HOT', 'NEW',
      'Following', 'Followers', 'Follower', 'Latest', 'News',
      'Add to Wishlist', 'Add to wishlist', 'Add to',
      'View Details', 'View details', 'View full details', 'View Full Details',
      'Get Started', 'Ratings', 'Rating',
      'Also Playing', 'Also Wishlisted',
      'Similar', 'Similar games', 'Recommended', 'Most Wishlisted',
      'Trending Games Now', 'Trending Games',
      'Set status', 'Status', 'Wishlist', 'Platforms',
      'Developer', 'Publisher', 'Release', 'Game info',
      'Join the Ultimate Gaming Community!',
      'Join now and level up your gaming!',
      'Join us for free', 'Join now',
      'Discover, track, and share your gaming journey with fellow enthusiasts.',
      'Players with this game', 'Wishlist Users', 'How was it?',
      'Public', 'Completionist', 'Main Story', 'Main + Sides', 'How Long To Beat',
      'Level Up!', 'Level up!', 'Уровень Up!', 'Check your profile to see what\'s new.', 'just dropped a new post',
      'is now', 'Get it', 'Get it on Steam', 'before the sale ends',
    ].map(normalizeKey),
  );

  const CHROME_SCOPE_SELS = [
    'header',
    'nav',
    'footer',
    'aside',
    '[role="banner"]',
    '[role="navigation"]',
    '[role="dialog"]',
    '[role="complementary"]',
    '[role="menu"]',
    '[role="menuitem"]',
    '[class*="opacity-"]',
    'button.tab-button',
    '.tab-button:is(button, a, [role="tab"])',
    'p.tab-button-label',
    '.game-follow-round-button',
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
    'main',
    'main button',
    'main a[class*="rounded"]',
  ].join(',');

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
    if (base.matches?.(CHROME_SCOPE_SELS.split(',')[0])) scopes.unshift(base);
    // Always include sticky top bars if present
    try {
      for (const el of base.querySelectorAll('[class*="sticky"], [class*="Sticky"]')) {
        if (!scopes.includes(el)) scopes.push(el);
      }
    } catch {
      /* ignore */
    }

    for (const scope of scopes) {
      if (shouldSkipRoot(scope)) continue;
      try {
        const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = tw.nextNode())) {
          const parent = node.parentElement;
          if (
            !parent ||
            shouldSkipRoot(parent) ||
            parent.isContentEditable ||
            ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'CANVAS'].includes(parent.tagName)
          ) {
            continue;
          }
          if (!isChromeContext(parent)) continue;
          const raw = node.nodeValue;
          const key = normalizeKey(raw || '');
          if (!key || key.length > 120) continue;
          if (!STUBBORN.has(key)) continue;
          const next = translateText(raw, parent);
          if (next != null && next !== raw) {
            node.nodeValue = next;
            markPill(parent);
          }
        }
      } catch {
        /* ignore */
      }

      let leaves;
      try {
        leaves = scope.querySelectorAll('span, button, a, label, li');
      } catch {
        continue;
      }
      for (const el of leaves) {
        if (shouldSkipRoot(el) || el.isContentEditable) continue;
        if (!isChromeContext(el)) continue;
        if (el.querySelector('svg, img, input, textarea, video, iframe, canvas')) continue;
        const text = normalizeKey(el.textContent || '');
        if (!text || text.length > 120 || !STUBBORN.has(text)) continue;
        const tr = translateText(text, el);
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

  return { translateText, translateNode, run, lookup, translatePseudos, translateKnown, forceStubborn };
}
