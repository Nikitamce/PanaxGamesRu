/** Whole-node timestamps and a few short badges. Never matches a sentence. */

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

const SHORT = { d: 'days', h: 'hours', m: 'minutes', s: 'seconds', w: 'weeks', y: 'years' };

function plural(n, forms) {
  const x = Math.abs(Number(n)) % 100;
  const d = x % 10;
  if (x > 10 && x < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}

function clean(s) {
  return String(s || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} raw
 * @returns {string | null} translation of the whole string, or null
 */
function likedTail(n, helped) {
  if (helped) return n ? `и ещё ${n} помогло` : 'и другим помогло';
  if (!n) return 'и другие оценили';
  const forms = ['человек', 'человека', 'человек'];
  const nAbs = Math.abs(Number(n) || 0);
  const mod10 = nAbs % 10;
  const mod100 = nAbs % 100;
  const form = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `и ещё ${n} ${form} оценили`;
}

const COUNT_FORMS = {
  like: ['лайк', 'лайка', 'лайков'],
  comment: ['комментарий', 'комментария', 'комментариев'],
  review: ['рецензия', 'рецензии', 'рецензий'],
  rating: ['оценка', 'оценки', 'оценок'],
  follower: ['подписчик', 'подписчика', 'подписчиков'],
  following: ['подписка', 'подписки', 'подписок'],
};

/** "6 likes" on like-count buttons. Whole string only. */
export function translateCount(raw) {
  const text = clean(raw);
  const m = text.match(/^([\d.,]+)\s*([KMBkmb])?\s+(likes?|comments?|reviews?|ratings?|followers?|following)$/i);
  if (!m) return null;
  const word = m[3].toLowerCase().replace(/s$/, '').replace(/^follower$/, 'follower');
  const key = word === 'following' ? 'following' : word;
  const forms = COUNT_FORMS[key];
  if (!forms) return null;
  const n = m[2] ? 5 : Number(m[1].replace(/,/g, ''));
  const num = `${m[1]}${m[2] || ''}`;
  return `${num} ${plural(Number.isFinite(n) ? n : 5, forms)}`;
}

function people(n) {
  return plural(n, ['человек', 'человека', 'человек']);
}

/** Whole notification line → Russian action, name kept separately. */
export function splitNotice(raw) {
  const text = clean(raw);
  if (!text || text.length > 160) return null;
  let m;
  if (/^commented on your post$/i.test(text)) return { name: '', ru: 'прокомментировал ваш пост' };
  if (/^started following$/i.test(text)) return { name: '', ru: 'подписался' };
  if (/^just dropped a new post$/i.test(text)) return { name: '', ru: 'опубликовал(а) новый пост' };
  if ((m = text.match(/^(.+?)\s+just dropped a new post$/i)) && m[1].length < 60) {
    return { name: m[1], ru: 'опубликовал(а) новый пост' };
  }
  if ((m = text.match(/^and\s+(\d+)\s+others?\s+liked your post$/i))) {
    return { name: '', ru: `и ещё ${m[1]} ${people(m[1])} оценили ваш пост` };
  }
  if ((m = text.match(/^(.+?)\s+commented on your post$/i)) && m[1].length < 60) {
    return { name: m[1], ru: 'прокомментировал ваш пост' };
  }
  if ((m = text.match(/^(.+?)\s+started following$/i)) && m[1].length < 60) {
    return { name: m[1], ru: 'подписался' };
  }
  if ((m = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+liked your post$/i)) && m[1].length < 60) {
    return { name: m[1], ru: `и ещё ${m[2]} ${people(m[2])} оценили ваш пост` };
  }
  if ((m = text.match(/^(.+?)\s+liked your post$/i)) && !/\band\b/i.test(m[1]) && m[1].length < 60) {
    return { name: m[1], ru: 'оценил ваш пост' };
  }
  return null;
}

/**
 * One notification text node. Does not join neighboring nodes, so the
 * bold name keeps its style and the gray action text keeps its own.
 */
export function translateNotice(raw, context = '') {
  const text = clean(raw);
  if (!text || text.length > 160) return null;
  if (/^(?:Level\s*Up!?|Уровень\s*Up!?)/i.test(text)) {
    return text.replace(/^(?:Level\s*Up!?|Уровень\s*Up!?)/i, 'Новый уровень!');
  }
  if (/^Check your (?:profile|Профиль) (?:to|До) see what['’]s new\.?$/i.test(text)) {
    return 'Загляните в профиль, чтобы узнать, что нового.';
  }
  if (/^Check your$/i.test(text)) return 'Загляните в';
  if (/^(?:to\s+)?see what['’]s new\.?$/i.test(text)) return ', чтобы узнать, что нового.';
  if (/^just dropped a new post$/i.test(text) || /^dropped a new post$/i.test(text)) {
    return 'опубликовал(а) новый пост';
  }
  const dropped = text.match(/^(.+?)\s+just dropped a new post$/i);
  if (dropped && dropped[1].length < 80) {
    return `${dropped[1]} опубликовал(а) новый пост`;
  }
  if (/^is now$/i.test(text)) return '— скидка';
  const saleTitle = text.match(/^(.+?)\s+is now\s+(\d+)%\s+off$/i);
  if (saleTitle) {
    return `${saleTitle[1]}: скидка ${saleTitle[2]}%`;
  }
  const isNowOff = text.match(/^is now\s+(\d+)%\s+off$/i);
  if (isNowOff) return `скидка ${isNowOff[1]}%`;
  const pctOff = text.match(/^(\d+)%\s+off$/i);
  if (pctOff) return `${pctOff[1]}%`;
  const upToOff = text.match(/^up to\s+(\d+)%\s+off$/i);
  if (upToOff) return `скидки до ${upToOff[1]}%`;
  const savePct = text.match(/^save\s+(\d+)%$/i);
  if (savePct) return `скидка ${savePct[1]}%`;

  if (/^Get it$/i.test(text)) return 'Купите';
  if (/^Get it on Steam$/i.test(text)) return 'Купите в Steam';
  if (/^Get it on Steam for$/i.test(text)) return 'Купите в Steam за';
  if (/^before the sale ends$/i.test(text) || /^before the sale ends on$/i.test(text)) {
    return 'до окончания скидки';
  }
  const steamFor = text.match(/^Steam for\s+(.+)$/i);
  if (steamFor) return `Steam за ${steamFor[1]}`;

  const saleBody = text.match(/^Get it\s*(?:on|в|Вкл\.)?\s*Steam for\s+([^b]+?)\s*before the sale ends\s*(?:on|в|Вкл\.)?\s*([a-zA-Z]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (saleBody) {
    const mon = MONTHS[saleBody[2].toLowerCase()] || saleBody[2];
    const day = parseInt(saleBody[3], 10);
    return `Купите в Steam за ${saleBody[1].trim()} до окончания скидки ${day} ${mon}${saleBody[4] ? ` ${saleBody[4]}` : ''}`;
  }
  const likedGames = text.match(/^Liked\s+(\d+\+?)\s+games?$/i);
  if (likedGames) {
    return `Понравилось ${likedGames[1]} игр`;
  }
  const dateMatch = text.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (dateMatch && MONTHS[dateMatch[1].toLowerCase()]) {
    const mon = MONTHS[dateMatch[1].toLowerCase()];
    const day = parseInt(dateMatch[2], 10);
    return `${day} ${mon}${dateMatch[3] ? ` ${dateMatch[3]}` : ''}`;
  }
  if (/^updates$/i.test(text)) return 'Обновления';
  if (/^highlights$/i.test(text)) return 'Главное';
  if (/^game chart$/i.test(text)) return 'Рейтинг игр';
  if (/^featured collections$/i.test(text)) return 'Избранные коллекции';
  if (/^platforms$/i.test(text)) return 'Платформы';
  if (/^request platforms$/i.test(text)) return 'Запросить платформы';
  if (/^game types$/i.test(text)) return 'Типы игр';
  if (/^main$/i.test(text)) return 'Основная игра';
  if (/^dlc & expansion$/i.test(text)) return 'DLC и дополнение';
  if (/^remake & remaster$/i.test(text)) return 'Ремейк и ремастер';
  if (/^edition & collection$/i.test(text)) return 'Издание и сборник';
  if (/^bundle$/i.test(text)) return 'Набор';
  if (/^share profile$/i.test(text)) return 'Поделиться профилем';
  if (/^connect playstation account$/i.test(text)) return 'Подключить аккаунт PlayStation';
  if (/^connect xbox account$/i.test(text)) return 'Подключить аккаунт Xbox';
  if (/^bookmarks$/i.test(text)) return 'Закладки';
  if (/^pin to your profile$/i.test(text)) return 'Закрепить в профиле';
  if (/^copy text$/i.test(text)) return 'Копировать текст';
  if (/^unfollow this user$/i.test(text)) return 'Отписаться от пользователя';
  if (/^not enough ratings yet$/i.test(text)) return 'Оценок пока недостаточно';
  if (/^edit profile$/i.test(text)) return 'Редактировать профиль';
  if (/^tell us your thoughts on a game$/i.test(text)) return 'Расскажите, что думаете об игре';
  if (/^commented on your post$/i.test(text)) return 'прокомментировал ваш пост';
  if (/^started following$/i.test(text)) return 'подписался';
  if (/^liked your post$/i.test(text)) {
    return /\band\s+\d+\s+others?\b/i.test(context) ? 'оценили ваш пост' : 'оценил ваш пост';
  }
  const andLiked = text.match(/^and\s+(\d+)\s+others?\s+liked your post$/i);
  if (andLiked) return `и ещё ${andLiked[1]} ${people(andLiked[1])} оценили ваш пост`;
  const nameAnd = text.match(/^(.+?)\s+and\s+(\d+)\s+others?$/i);
  if (nameAnd && nameAnd[1].length < 60) {
    return `${nameAnd[1]} и ещё ${nameAnd[2]} ${people(nameAnd[2])}`;
  }
  const namedComment = text.match(/^(.+?)\s+commented on your post$/i);
  if (namedComment && namedComment[1].length < 80) return `${namedComment[1]} прокомментировал ваш пост`;
  const namedLike = text.match(/^(.+?)\s+liked your post$/i);
  if (namedLike && !/\band\b/i.test(namedLike[1]) && namedLike[1].length < 80) {
    return `${namedLike[1]} оценил ваш пост`;
  }
  const othersLike = text.match(/^(.+?)\s+and\s+(\d+)\s+others?\s+liked your post$/i);
  if (othersLike) {
    return `${othersLike[1]} и ещё ${othersLike[2]} ${people(othersLike[2])} оценили ваш пост`;
  }
  const started = text.match(/^(.+?)\s+started following$/i);
  if (started && started[1].length < 60) return `${started[1]} подписался`;
  return null;
}

/** Like-lines and removed-comment notices. Whole string only. */
export function translateActivity(raw) {
  const text = clean(raw);
  if (!text || text.length > 160) return null;
  const deleted = text.match(/^This (comment|post|review|reply) has been deleted\.?$/i);
  if (deleted) {
    const kind = deleted[1].toLowerCase();
    if (kind === 'review') return 'Эта рецензия удалена.';
    const noun = { comment: 'комментарий', post: 'пост', reply: 'ответ' }[kind];
    return `Этот ${noun} удалён.`;
  }
  const liked = text.match(/^(?:(.+?)\s+)?and\s+(?:(\d+)\s+)?others?\s+(liked|got help)$/i);
  if (liked) {
    const who = liked[1] ? `${liked[1]} ` : '';
    return `${who}${likedTail(liked[2], /got help/i.test(liked[3]))}`;
  }
  if (/^helped$/i.test(text)) return 'Помогло';
  const flair = {
    tips: 'Советы',
    ask: 'Вопрос',
    lfg: 'Ищу пати',
    flex: 'Флекс',
    quiz: 'Викторина',
    impressions: 'Впечатления',
    moments: 'Моменты',
    rant: 'Накипело',
    deal: 'Сделка',
    'off-topic': 'Оффтоп',
    'off topic': 'Оффтоп',
    meme: 'Мем',
    haul: 'Находки',
    spoiler: 'Спойлер',
    'news flash': 'Молния',
    hide: 'Скрыть',
    recommend: 'Рекомендуем',
    random: 'Случайно',
    'most rated': 'Больше всего оценок',
    'most reviewed': 'Больше всего рецензий',
    'most goty awards': 'Больше всего наград GOTY',
    'old release': 'Старые релизы',
    'a-z': 'А–Я',
    'z-a': 'Я–А',
  }[text.toLowerCase()];
  if (flair) return flair;
  if (/^the first goal is right in front of you!$/i.test(text)) return 'Первая цель уже перед тобой!';
  if (/^not interested in this game\??$/i.test(text)) return 'Эта игра не интересна?';
  const filters = text.match(/^filters:\s*(.+)$/i);
  if (filters && text.length < 80) return `Фильтры: ${filters[1]}`;
  if (/^panax store$/i.test(text)) return 'Магазин PANAX';
  if (/^pick an emoji[.…]{0,3}$/i.test(text)) return 'Выберите эмодзи…';
  if (/^search emoji$/i.test(text)) return 'Поиск эмодзи';
  if (/^tell us your thoughts on a game$/i.test(text)) return 'Расскажите, что думаете об игре';
  if (/^log in daily to level up unlock avatar items! streak resets daily at 3 am\.?$/i.test(text)) {
    return 'Заходите каждый день, чтобы повышать уровень и открывать предметы аватара! Серия сбрасывается каждый день в 3:00.';
  }
  const expStreak = text.match(/^exp\s*\+\s*([\d.,]+)\s+you(?:'|’)re on an?\s+(\d+)-day streak$/i);
  if (expStreak) {
    return `Опыт + ${expStreak[1]} Серия: ${expStreak[2]} ${plural(expStreak[2], ['день', 'дня', 'дней'])}`;
  }
  const streak = text.match(/^you(?:'|’)re on an?\s+(\d+)-day streak$/i);
  if (streak) return `Серия: ${streak[1]} ${plural(streak[1], ['день', 'дня', 'дней'])}`;
  const exp = text.match(/^exp\s*\+\s*([\d.,]+)$/i);
  if (exp) return `Опыт + ${exp[1]}`;
  if (/what['’′]s on your mind\??\s*use\s+#+\s*to tag a game[.…]*/i.test(text) && text.length < 90) {
    return 'О чём думаешь? Через ## можно отметить игру';
  }
  const added = text.match(/^(.*?)added\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (added && text.length < 160) {
    const prefix = added[1].trim();
    const forms = UNIT[added[3].toLowerCase()];
    if (forms && prefix.length <= 80 && !/[.!?]/.test(prefix)) {
      const tail = `Добавлено ${added[2]} ${plural(added[2], forms)} назад`;
      return prefix ? `${prefix} ${tail}` : tail;
    }
  }
  if (/^linked$/i.test(text)) return 'Подключено';
  if (/^challenges$/i.test(text)) return 'Испытания';
  const addGames = text.match(/^Add games to (Backlog|Wishlist|Playing|Beaten|Paused|Quit)$/i);
  if (addGames) {
    const into = {
      backlog: 'планы',
      wishlist: 'желаемое',
      playing: '«Играю»',
      beaten: '«Пройдено»',
      paused: '«Пауза»',
      quit: '«Брошено»',
    }[addGames[1].toLowerCase()];
    if (into) return `Добавить игры в ${into}`;
  }
  const profileTab = text.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?$/i);
  if (profileTab) {
    const labels = {
      posts: 'Посты',
      reviews: 'Рецензии',
      collections: 'Коллекции',
      'following games': 'Игры в подписках',
      top: 'Топ',
    };
    const label = labels[profileTab[1].toLowerCase()];
    if (label) return profileTab[2] ? `${label} ${profileTab[2].replace(/\s+/g, '')}` : label;
  }
  return null;
}

export function translateTimestamp(raw) {
  const text = clean(raw);
  if (!text || text.length > 48) return null;

  const leadMatch = text.match(/^([·•∙⋅・\u2219\u22C5\u30FB.\-–—]+\s*)/);
  const lead = leadMatch ? leadMatch[1].trim() : '';
  const body = leadMatch ? text.slice(leadMatch[1].length).trim() : text;
  if (!body) return null;

  const out = stampBody(body);
  if (!out) return null;
  return lead ? `${lead} ${out}` : out;
}

function stampBody(body) {
  if (/^just now$/i.test(body)) return 'только что';
  if (/^yesterday$/i.test(body)) return 'вчера';
  if (/^today$/i.test(body)) return 'сегодня';
  if (/^tomorrow$/i.test(body)) return 'завтра';

  const compact = body.match(/^(\d+)\s*([dhmswy])\s*ago$/i);
  if (compact) {
    const forms = UNIT[SHORT[compact[2].toLowerCase()]];
    if (forms) return `${compact[1]} ${plural(compact[1], forms)} назад`;
  }

  const wordAgo = body.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (wordAgo) {
    const forms = UNIT[wordAgo[2].toLowerCase()];
    if (forms) return `${wordAgo[1]} ${plural(wordAgo[1], forms)} назад`;
  }

  const addedWords = body.match(/^added\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (addedWords) {
    const forms = UNIT[addedWords[2].toLowerCase()];
    if (forms) return `Добавлено ${addedWords[1]} ${plural(addedWords[1], forms)} назад`;
  }

  const updated = body.match(/^updated\s+(\d+)\s*([dhmswy])\s*ago$/i);
  if (updated) {
    const forms = UNIT[SHORT[updated[2].toLowerCase()]];
    if (forms) return `Обновлено ${updated[1]} ${plural(updated[1], forms)} назад`;
  }

  const month = body.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i,
  );
  if (month) {
    const ru = MONTHS[month[1].toLowerCase()];
    if (ru) return `${month[2]} ${ru}${month[3] ? ` ${month[3]}` : ''}`;
  }

  const dayFirst = body.match(
    /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?(?:,?\s*(\d{4}))?$/i,
  );
  if (dayFirst) {
    const ru = MONTHS[dayFirst[2].toLowerCase()];
    if (ru) return `${dayFirst[1]} ${ru}${dayFirst[3] ? ` ${dayFirst[3]}` : ''}`;
  }

  return null;
}
