/**
 * Mutate next-intl message catalogs found on React fibers (MAIN world).
 * Patches by English value AND by known message key leaf names.
 */
export function startMessagesPatch(dict) {
  const fold = new Map();
  for (const [k, v] of Object.entries(dict)) {
    fold.set(k, v);
    fold.set(k.toLowerCase(), v);
  }

  /** next-intl key leaf → Russian (from live panax catalog) */
  const BY_KEY = {
    'following-title': dict.Following || 'Подписки',
    'following-common': dict.Following || 'Подписки',
    'follower-common-one': dict.Follower || 'Подписчик',
    'follower-common-other': dict.Followers || 'Подписчики',
    'c-hot-common': dict.Hot || 'Горячее',
    'c-latest-common': dict.Latest || 'Свежее',
    'news-common': dict.News || 'Новости',
    'wishlist-common': dict.Wishlist || 'Желаемое',
    'join-banner-title':
      dict['Join now and level up your gaming!'] ||
      'Присоединяйся и прокачивай свой гейминг!',
    'join-banner-button': dict['Join us for free'] || 'Присоединяйся бесплатно',
    'join-now-button': dict['Join now'] || 'Присоединиться',
    'start-button': dict['Get Started'] || 'Начать',
    'view-full-details-button': dict['View full details'] || dict['View Details'] || 'Подробнее',
    'welcome-trending-label': dict['Trending Games Now'] || 'В тренде',
    'discover-common': dict.Discover || 'Обзор',
    'follow-common': dict.Follow || 'Подписка',
    'unfollow-button': dict.Unfollow || 'Отписка',
    'playing-common': dict.Playing || 'Играю',
    'backlog-common': dict.Backlog || 'В планах',
    'beaten-common': dict.Beaten || dict.Completed || 'Пройдено',
    'paused-common': dict.Paused || 'Пауза',
    'quit-common': dict.Quit || dict.Dropped || 'Брошено',
    'write-review-button': dict['Write a review'] || dict['Write a Review'] || 'Написать рецензию',
    'more-link': dict.More || 'Ещё',
    'rating-common-one': dict.Rating || 'Оценка',
    'rating-common-other': dict.Ratings || 'Оценки',
    'platforms-common': dict.Platforms || 'Платформы',
    'developer-common': dict.Developer || 'Разработчик',
    'publisher-common': dict.Publisher || 'Издатель',
    'release-common': dict.Release || 'Релиз',
    'similar-game-common': dict['Similar games'] || 'Похожие игры',
    'set-status-label': dict['Set status'] || 'Статус',
    'status-common': dict.Status || 'Статус',
    'game-info-common': dict['Game info'] || 'Об игре',
    'about-label': dict.About || 'О игре',
    'dscrp-common': dict.Description || 'Описание',
    'storyline-common': dict.Storyline || 'Сюжет',
    'achv-title': dict.Achievements || 'Достижения',
    'other-status-section': dict['Players with this game'] || 'Игроки с этой игрой',
    'other-wishlist-title': dict['Wishlist Users'] || 'В желаемом',
    'rate-status-section': dict['How was it?'] || 'Как вам?',
    'most-helpful-review-section': dict['Most helpful reviews'] || 'Самые полезные рецензии',
    'player-data-label': dict['Player data'] || 'Данные игроков',
    'suggest-edit-link': dict['Suggest an edit'] || 'Предложить правку',
    'wrong-info-dscrp': dict['See something wrong?'] || 'Нашли ошибку?',
    'info-title': dict.Information || 'Информация',
    'genre-common': dict.Genre || dict.Genres || 'Жанр',
    'add-to-title': dict['Add to'] || 'Добавить в',
    'first-review-micro': dict['Be the first to write a review'] || 'Напишите первую рецензию',
    'whats-buzzing-section': dict["What's Buzzing?"] || 'О чём говорят?',
    'who-follow-title': dict['Who to follow'] || 'Кого читать',
    'new-post-title': dict['New post'] || 'Новый пост',
    'public-option': dict.Public || 'Публично',
    'spoiler-alert': dict['Spoiler alert'] || 'Спойлер',
    'cmnt-off-option': dict['Turn off comments'] || 'Отключить комментарии',
  };

  function tr(s) {
    if (typeof s !== 'string' || s.length < 2 || s.length > 240) return null;
    return fold.get(s) ?? fold.get(s.toLowerCase()) ?? null;
  }

  function trKey(key, val) {
    if (typeof val !== 'string') return null;
    const leaf = String(key).split('.').pop();
    if (leaf && BY_KEY[leaf] && BY_KEY[leaf] !== val) return BY_KEY[leaf];
    return tr(val);
  }

  function patchObject(obj, seen, depth) {
    if (!obj || typeof obj !== 'object' || depth > 12 || seen.has(obj)) return 0;
    seen.add(obj);
    let n = 0;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i += 1) {
        if (typeof obj[i] === 'string') {
          const next = tr(obj[i]);
          if (next && next !== obj[i]) {
            obj[i] = next;
            n += 1;
          }
        } else n += patchObject(obj[i], seen, depth + 1);
      }
      return n;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string') {
        const next = trKey(key, val);
        if (next && next !== val) {
          obj[key] = next;
          n += 1;
        }
      } else if (val && typeof val === 'object') {
        n += patchObject(val, seen, depth + 1);
      }
    }
    return n;
  }

  function fiberMessages(fiber, depth) {
    if (!fiber || depth > 60) return 0;
    let n = 0;
    const props = fiber.memoizedProps || fiber.pendingProps;
    if (props) {
      if (props.messages && typeof props.messages === 'object') {
        n += patchObject(props.messages, new WeakSet(), 0);
      }
      if (props.value?.messages && typeof props.value.messages === 'object') {
        n += patchObject(props.value.messages, new WeakSet(), 0);
      }
      // next-intl sometimes nests under locale / formats
      if (props.value && typeof props.value === 'object' && props.value.locale) {
        n += patchObject(props.value, new WeakSet(), 0);
      }
    }
    const state = fiber.memoizedState;
    if (state && typeof state === 'object') {
      let s = state;
      let guard = 0;
      while (s && guard < 24) {
        if (s.memoizedState?.messages) n += patchObject(s.memoizedState.messages, new WeakSet(), 0);
        if (s.queue?.lastRenderedState?.messages) {
          n += patchObject(s.queue.lastRenderedState.messages, new WeakSet(), 0);
        }
        // Catch plain message maps hanging on hook state
        if (s.memoizedState && typeof s.memoizedState === 'object' && !Array.isArray(s.memoizedState)) {
          const ms = s.memoizedState;
          if (ms.common || ms.community || ms.game) n += patchObject(ms, new WeakSet(), 0);
        }
        s = s.next;
        guard += 1;
      }
    }
    n += fiberMessages(fiber.child, depth + 1);
    n += fiberMessages(fiber.sibling, depth + 1);
    return n;
  }

  function scan() {
    const roots = [document.getElementById('__next'), document.body, document.documentElement].filter(Boolean);
    let total = 0;
    for (const el of roots) {
      for (const key of Object.keys(el)) {
        if (!key.startsWith('__react') && !key.startsWith('_react')) continue;
        const fiber = el[key];
        if (!fiber) continue;
        const start = fiber.stateNode || fiber.child || fiber;
        try {
          total += fiberMessages(start, 0);
        } catch {
          /* ignore */
        }
      }
    }
    if (total > 0) console.info(`[PANAX RU] patched ${total} next-intl message values`);
    return total;
  }

  let tries = 0;
  const tick = () => {
    scan();
    tries += 1;
    if (tries < 80) setTimeout(tick, 200);
    else if (tries < 160) setTimeout(tick, 800);
    else if (tries < 220) setTimeout(tick, 3000);
  };
  setTimeout(tick, 50);
}
