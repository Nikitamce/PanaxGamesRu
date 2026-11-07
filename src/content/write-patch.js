/**
 * MAIN-world intercept: when React writes stubborn English chrome into
 * text nodes, swap to Russian before paint. Needed for hardcoded JSX
 * strings that are not in the next-intl catalog (e.g. Add to Wishlist).
 */
import { shouldSkipRoot, isChromeContext, AMBIGUOUS_SHORT } from './skip.js';
import { translateTimestamp, translateActivity, translateCount, translateNotice } from './time.js';

function normalizeKey(s) {
  return String(s || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function preserveEdges(raw, next) {
  const m = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m) return next;
  return m[1] + next + m[3];
}

export function startWritePatch(dict) {
  if (globalThis.__PANAX_RU_WRITE_PATCH__) return;
  globalThis.__PANAX_RU_WRITE_PATCH__ = true;

  const map = new Map();
  const add = (en, ru) => {
    if (!en || !ru) return;
    map.set(en, ru);
    map.set(en.toLowerCase(), ru);
  };

  // Hardcoded / stubborn chrome React keeps restoring
  const pairs = [
    ['Public', dict.Public || 'Публичный'],
    ['Private', dict.Private || 'Приватный'],
    ['Followers only', dict['Followers only'] || 'Только подписчики'],
    ['just dropped a new post', 'опубликовал новый пост'],
    ['dropped a new post', 'опубликовал новый пост'],
    ['Add to Wishlist', dict['Add to Wishlist'] || 'В желаемое'],
    ['Add to wishlist', dict['Add to Wishlist'] || 'В желаемое'],
    ['View Details', dict['View Details'] || 'Подробнее'],
    ['View details', dict['View Details'] || 'Подробнее'],
    ['View full details', dict['View full details'] || 'Подробнее'],
    ['View Full Details', dict['View full details'] || 'Подробнее'],
    ['Hot', dict.Hot || 'Горячее'],
    ['New', dict.New || 'Новое'],
    ['HOT', 'ГОРЯЧЕЕ'],
    ['NEW', 'НОВОЕ'],
    ['Followers', dict.Followers || 'Подписчики'],
    ['Follower', dict.Follower || 'Подписчик'],
    ['Following', dict.Following || 'Подписки'],
    ['Ratings', dict.Ratings || 'Оценки'],
    ['Rating', dict.Rating || 'Оценка'],
    ['Wishlist', dict.Wishlist || 'Желаемое'],
    ['Also Playing', dict['Also Playing'] || 'Тоже играют'],
    ['Also Wishlisted', dict['Also Wishlisted'] || 'Тоже в желаемом'],
    ['Set status', dict['Set status'] || 'Статус'],
    ['Platforms', dict.Platforms || 'Платформы'],
    ['Developer', dict.Developer || 'Разработчик'],
    ['Publisher', dict.Publisher || 'Издатель'],
    ['Release', dict.Release || 'Релиз'],
    ['Similar games', dict['Similar games'] || 'Похожие игры'],
    ['Similar', dict.Similar || 'Похожие'],
    ['Get Started', dict['Get Started'] || 'Начать'],
    ['Join us for free', dict['Join us for free'] || 'Присоединяйся бесплатно'],
    ['Join now', dict['Join now'] || 'Присоединиться'],
    ['Join now and level up your gaming!', dict['Join now and level up your gaming!'] || 'Присоединяйся и прокачивай свой гейминг!'],
    ["What's Buzzing?", dict["What's Buzzing?"] || 'О чём говорят?'],
    ['Most talked about right now', dict['Most talked about right now'] || 'Сейчас обсуждают больше всего'],
    ['Who to follow', dict['Who to follow'] || 'Кого читать'],
    ['New post', dict['New post'] || 'Новый пост'],
    ['Public', dict.Public || 'Публично'],
    ['Completionist', dict.Completionist || '100% прохождение'],
    ['Main Story', dict['Main Story'] || 'Основной сюжет'],
    ['Main + Sides', dict['Main + Sides'] || 'Сюжет + побочки'],
    ['How Long To Beat', dict['How Long To Beat'] || 'How Long To Beat'],
    ['Level Up!', dict['Level Up!'] || 'Новый уровень!'],
    ['Level up!', dict['Level Up!'] || 'Новый уровень!'],
    ['Level up', dict['Level Up!'] || 'Новый уровень'],
    ['Уровень Up!', 'Новый уровень!'],
    ['Уровень Up', 'Новый уровень'],
    ["Check your profile to see what's new.", dict["Check your profile to see what's new."] || 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your profile to see what’s new.', dict['Check your profile to see what’s new.'] || 'Загляните в профиль, чтобы узнать, что нового.'],
    ["Check your профиль to see what's new.", 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your профиль to see what’s new.', 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your Профиль to see what\'s new.', 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your Профиль to see what’s new.', 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your Профиль До see what\'s new.', 'Загляните в профиль, чтобы узнать, что нового.'],
    ['Check your Профиль До see what’s new.', 'Загляните в профиль, чтобы узнать, что нового.'],
    ["to see what's new.", ', чтобы узнать, что нового.'],
    ['to see what’s new.', ', чтобы узнать, что нового.'],
    ["to see what's new", ', чтобы узнать, что нового.'],
    ['to see what’s new', ', чтобы узнать, что нового.'],
    ["see what's new.", ', чтобы узнать, что нового.'],
    ['see what’s new.', ', чтобы узнать, что нового.'],
    ['Check your', 'Загляните в свой'],
    ['Check your ', 'Загляните в свой '],
    ['just dropped a new post', dict['just dropped a new post'] || 'опубликовал(а) новый пост'],
    ['dropped a new post', dict['dropped a new post'] || 'опубликовал(а) новый пост'],
    ['is now', '— скидка'],
    ['Get it', 'Купите'],
    ['Get it on Steam', 'Купите в Steam'],
    ['Get it on Steam for', 'Купите в Steam за'],
    ['before the sale ends', 'до окончания скидки'],
    ['before the sale ends on', 'до окончания скидки'],
    ['What game is this about?', dict['What game is this about?'] || 'О какой игре пост?'],
    ["What's on your mind? Use ## to tag a game", dict["What's on your mind? Use ## to tag a game"] || 'О чём думаешь? Через ## можно отметить игру'],
    ['Spoiler alert', dict['Spoiler alert'] || 'Спойлер'],
    ['Turn off comments', dict['Turn off comments'] || 'Отключить комментарии'],
    ['Frequently used', dict['Frequently used'] || 'Часто используемые'],
    ['Smileys & People', dict['Smileys & People'] || 'Смайлы и люди'],
    ['Animals & Nature', dict['Animals & Nature'] || 'Животные и природа'],
    ['Food & Drink', dict['Food & Drink'] || 'Еда и напитки'],
    ['Travel & Places', dict['Travel & Places'] || 'Путешествия и места'],
    ['Pick an emoji...', dict['Pick an emoji...'] || 'Выберите эмодзи…'],
    ['Pick an emoji', dict['Pick an emoji'] || 'Выберите эмодзи'],
    ['Tag a game', dict['Tag a game'] || 'Отметить игру'],
    ['Enter a game title', dict['Enter a game title'] || 'Введите название игры'],
    ['Choose a label for this post', dict['Choose a label for this post'] || 'Выберите ярлык для поста'],
    ['Off-Topic', dict['Off-Topic'] || 'Оффтоп'],
    ['Not interested in this game?', dict['Not interested in this game?'] || 'Эта игра не интересна?'],
    ['Hide', dict.Hide || 'Скрыть'],
    [
      'Link games so others can jump straight into the info! In comments, simply type ## to link.',
      dict['Link games so others can jump straight into the info! In comments, simply type ## to link.'] ||
        'Отмечайте игры, чтобы другие сразу открывали карточку. В комментариях для этого пишите ##.',
    ],
    [
      'Games you posted about in the last 7 days, or trending games.',
      dict['Games you posted about in the last 7 days, or trending games.'] ||
        'Игры, о которых вы писали за последние 7 дней, и игры в тренде.',
    ],
    ['Discard this post?', dict['Discard this post?'] || 'Удалить этот пост?'],
    ["If you leave now, your draft won't be saved.", dict["If you leave now, your draft won't be saved."] || 'Если выйти сейчас, черновик не сохранится.'],
    ['Keep posting', dict['Keep posting'] || 'Продолжить'],
    ['Discard', dict.Discard || 'Удалить'],
    ['Pin games', dict['Pin games'] || 'Закрепить игры'],
    ['Want quick access to your games?', dict['Want quick access to your games?'] || 'Нужен быстрый доступ к играм?'],
    ['Pin them to the top!', dict['Pin them to the top!'] || 'Закрепите их наверху!'],
    ['About Us', dict['About Us'] || 'О нас'],
    ['Settings', dict.Settings || 'Настройки'],
    ['Send feedback', dict['Send feedback'] || 'Написать отзыв'],
    ['Space', dict.Space || 'Пространство'],
    ['Game Rate', dict['Game Rate'] || 'Оценки игр'],
    ['Preferences', dict.Preferences || 'Параметры'],
    ['Language', dict.Language || 'Язык'],
    ['Blocked management', dict['Blocked management'] || 'Заблокированные'],
    ['Service', dict.Service || 'Сервис'],
    ['FAQ', dict.FAQ || 'Вопросы и ответы'],
    ['Privacy Policy', dict['Privacy Policy'] || 'Политика конфиденциальности'],
    ['Terms of Service', dict['Terms of Service'] || 'Условия использования'],
    ['Cookie Policy', dict['Cookie Policy'] || 'Политика cookie'],
    ['Community Guideline', dict['Community Guideline'] || 'Правила сообщества'],
    ['Account', dict.Account || 'Аккаунт'],
    ['Signed in with Google', dict['Signed in with Google'] || 'Вход через Google'],
    ['Manage account', dict['Manage account'] || 'Управление аккаунтом'],
    ['Platforms & games', dict['Platforms & games'] || 'Платформы и игры'],
    ['Linked platforms', dict['Linked platforms'] || 'Привязанные платформы'],
    ['Hidden games', dict['Hidden games'] || 'Скрытые игры'],
    ['Display language', dict['Display language'] || 'Язык интерфейса'],
    ['Content language', dict['Content language'] || 'Язык контента'],
    ['English', dict.English || 'Английский'],
    ['Korean', dict.Korean || 'Корейский'],
    ['Japanese', dict.Japanese || 'Японский'],
    ['Portuguese', dict.Portuguese || 'Португальский'],
    ['Spanish', dict.Spanish || 'Испанский'],
    ['French', dict.French || 'Французский'],
    ['More languages are on the way.', dict['More languages are on the way.'] || 'Скоро появятся другие языки.'],
    [
      "Select the language we'll translate posts, reviews, and comments into.",
      dict["Select the language we'll translate posts, reviews, and comments into."] ||
        'Выберите язык, на который переводить посты, рецензии и комментарии.',
    ],
    [
      'Select the language for menus, buttons, and system text.',
      dict['Select the language for menus, buttons, and system text.'] ||
        'Выберите язык меню, кнопок и системного текста.',
    ],
    [
      'Initially set to match your system language (or English if unsupported). Any changes you make will be saved.',
      dict['Initially set to match your system language (or English if unsupported). Any changes you make will be saved.'] ||
        'Сначала берётся язык системы (или английский, если язык не поддерживается). Изменения сохраняются.',
    ],
    [
      'Language for menus, buttons, and system text',
      dict['Language for menus, buttons, and system text'] || 'Язык меню, кнопок и системного текста',
    ],
    [
      'Language for translated posts, reviews, and comments',
      dict['Language for translated posts, reviews, and comments'] ||
        'Язык переведённых постов, рецензий и комментариев',
    ],
    ['Connect to update your Trophy Hall', dict['Connect to update your Trophy Hall'] || 'Подключите, чтобы обновить зал трофеев'],
    ['How to disconnect', dict['How to disconnect'] || 'Как отключить'],
  ];
  for (const [en, ru] of pairs) add(en, ru);

  const EDITOR_SEL = '.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn, [class*="subtab-btn"], [class*="footer-btn"], [class*="floating-btn"]';

  function translateRaw(raw, parent) {
    if (typeof raw !== 'string') return null;
    const key = normalizeKey(raw);
    if (!key || key.length > 240) return null;
    if (!(parent && parent.isContentEditable)) {
      const stamped = translateTimestamp(raw) ?? translateNotice(raw) ?? translateActivity(raw) ?? translateCount(raw);
      if (stamped != null && normalizeKey(stamped) !== key) return preserveEdges(raw, stamped);
    }
    const level = key.match(/^Lv\.?\s*(\d+)$/i);
    if (level) return preserveEdges(raw, `Лвл ${level[1]}`);
    if (/^Lv$/i.test(key)) return preserveEdges(raw, 'Лвл');
    const profileTab = key.match(/^(Posts|Reviews|Collections|Following games|Top)(?:\s+([\d.,]+\s*[KMBkmb]?))?(?:\s*[▾▼˅])?$/i);
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
    if (/\bLv\.?\s*\d+\b/i.test(key) && key.length < 80) {
      const next = key.replace(/\bLv\.?\s*(\d+)\b/gi, 'Лвл $1');
      if (next !== key) return preserveEdges(raw, next);
    }
    const liked = key.match(/^(.+?)\s+and\s+(?:(\d+)\s+)?others?\s+liked$/i);
    if (liked && key.length < 120) {
      const who = liked[1];
      const n = liked[2];
      const forms = ['человек', 'человека', 'человек'];
      const nAbs = Math.abs(Number(n) || 0);
      const mod10 = nAbs % 10;
      const mod100 = nAbs % 100;
      const form = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
      const tail = /got help/i.test(key) ? (n ? `и ещё ${n} помогло` : 'и другим помогло') : (n ? `и ещё ${n} ${form} оценили` : 'и другие оценили');
      return preserveEdges(raw, `${who} ${tail}`);
    }
    if (parent && /^more$/i.test(key) && (parent.classList?.contains('more-button-inline') || parent.closest?.('.more-button-inline'))) {
      return preserveEdges(raw, 'Ещё');
    }
    if (parent?.closest?.(EDITOR_SEL) || parent?.matches?.(EDITOR_SEL)) {
      const editor = {
        edit: 'Изменить', exit: 'Выйти', colors: 'Цвета', hair: 'Волосы', beard: 'Борода', shape: 'Форма',
        brows: 'Брови', eyes: 'Глаза', nose: 'Нос', mouth: 'Рот', top: 'Верх', bottom: 'Низ', shoes: 'Обувь',
        glasses: 'Очки', cap: 'Кепка', age: 'Возраст', makeup: 'Макияж', paint: 'Краска', scar: 'Шрам', spot: 'Пятно', pose: 'Поза',
        custom: 'Своё',
      }[key.toLowerCase()];
      if (editor) return preserveEdges(raw, editor);
    }
    if (parent) {
      if (shouldSkipRoot(parent) || parent.isContentEditable) return null;
      if (AMBIGUOUS_SHORT.has(key.toLowerCase()) && !isChromeContext(parent)) return null;
    }
    const hit = map.get(key) ?? map.get(key.toLowerCase());
    if (!hit || hit === key) return null;
    return preserveEdges(raw, hit);
  }

  function patchAccessor(obj, prop) {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (!desc || !desc.set || !desc.get || !desc.configurable) return false;
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        return desc.get.call(this);
      },
      set(v) {
        try {
          if (typeof v === 'string' && v.length >= 2 && v.length <= 160) {
            const parent = this.nodeType === 3 ? this.parentElement : this;
            const next = translateRaw(v, parent);
            if (next != null) v = next;
          }
        } catch {
          /* ignore */
        }
        return desc.set.call(this, v);
      },
    });
    return true;
  }

  // Text nodes: React often sets nodeValue / data
  patchAccessor(Node.prototype, 'nodeValue');
  if (typeof CharacterData !== 'undefined') {
    patchAccessor(CharacterData.prototype, 'data');
  }

  // Elements: occasional textContent writes on leaves
  const textDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (textDesc?.set && textDesc.configurable) {
    Object.defineProperty(Node.prototype, 'textContent', {
      configurable: true,
      enumerable: textDesc.enumerable,
      get() {
        return textDesc.get.call(this);
      },
      set(v) {
        try {
          if (typeof v === 'string' && this.nodeType === 1 && this.childElementCount === 0) {
            const next = translateRaw(v, this);
            if (next != null) v = next;
          }
        } catch {
          /* ignore */
        }
        return textDesc.set.call(this, v);
      },
    });
  }

  const EDITOR_WORDS = {
    edit: 'Изменить', exit: 'Выйти', colors: 'Цвета', hair: 'Волосы', beard: 'Борода', shape: 'Форма',
    brows: 'Брови', eyes: 'Глаза', nose: 'Нос', mouth: 'Рот', top: 'Верх', bottom: 'Низ', shoes: 'Обувь',
    glasses: 'Очки', cap: 'Кепка', age: 'Возраст', makeup: 'Макияж', paint: 'Краска', scar: 'Шрам', spot: 'Пятно', pose: 'Поза',
    custom: 'Своё',
  };
  const editorHost = (el) => el?.closest?.(EDITOR_SEL);

  function paintEditorTree(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      const word = EDITOR_WORDS[normalizeKey(node.nodeValue || '').toLowerCase()];
      if (word && editorHost(node.parentElement)) node.nodeValue = word;
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.matches?.(EDITOR_SEL) || editorHost(node)) {
      for (const child of node.childNodes) paintEditorTree(child);
      return;
    }
    const nested = node.querySelectorAll?.(EDITOR_SEL);
    if (nested) for (const host of nested) paintEditorTree(host);
  }

  const appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    try {
      if (child?.nodeType === 3 && editorHost(this)) {
        const word = EDITOR_WORDS[normalizeKey(child.nodeValue || '').toLowerCase()];
        if (word) child.nodeValue = word;
      }
    } catch { /* ignore */ }
    const out = appendChild.call(this, child);
    return out;
  };

  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (child, ref) {
    try {
      if (child?.nodeType === 3 && editorHost(this)) {
        const word = EDITOR_WORDS[normalizeKey(child.nodeValue || '').toLowerCase()];
        if (word) child.nodeValue = word;
      }
    } catch { /* ignore */ }
    return insertBefore.call(this, child, ref);
  };

  const mo = new MutationObserver((list) => {
    for (const rec of list) {
      if (rec.type === 'attributes') {
        if (editorHost(rec.target) || rec.target.matches?.(EDITOR_SEL)) paintEditorTree(rec.target);
        continue;
      }
      for (const node of rec.addedNodes) paintEditorTree(node);
    }
  });
  const shadowRoots = new Set();
  const watchRoot = (root) => {
    if (!root || shadowRoots.has(root)) return;
    shadowRoots.add(root);
    try {
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    } catch {
      /* not a node */
    }
  };
  watchRoot(document.documentElement);
  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const root = attachShadow.call(this, init);
    watchRoot(root);
    return root;
  };

  function paintHost(host) {
    paintEditorTree(host);
    const whole = normalizeKey(host.textContent || '').toLowerCase();
    const ru = EDITOR_WORDS[whole];
    if (ru) {
      const texts = [];
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) texts.push(c);
          else if (c.nodeType === 1 && c.tagName !== 'IMG' && c.tagName !== 'SVG' && c.tagName !== 'CANVAS') walk(c);
        }
      };
      walk(host);
      if (texts.length) {
        const lead = (texts[0].nodeValue.match(/^\s*/) || [''])[0];
        texts[0].nodeValue = lead + ru;
        for (let i = 1; i < texts.length; i += 1) texts[i].nodeValue = '';
      }
    }
    let pending = false;
    const see = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3 && EDITOR_WORDS[normalizeKey(c.nodeValue || '').toLowerCase()]) pending = true;
        else if (c.nodeType === 1 && c.tagName !== 'IMG' && c.tagName !== 'SVG') see(c);
      }
    };
    see(host);
    if (!pending) host.setAttribute('data-panax-ru-on', '');
  }

  const paintRoot = (root) => {
    if (!root?.querySelectorAll) return;
    let hosts;
    try {
      hosts = root.querySelectorAll(EDITOR_SEL);
    } catch {
      return;
    }
    for (const host of hosts) paintHost(host);
  };

  const paintFrame = () => {
    try {
      paintRoot(document);
      for (const root of shadowRoots) paintRoot(root);
    } catch {
      /* ignore */
    }
    requestAnimationFrame(paintFrame);
  };
  requestAnimationFrame(paintFrame);

  console.info('[PANAX RU] write-patch active (stubborn chrome)');
}
