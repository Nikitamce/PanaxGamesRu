# Памятка для ИИ по проекту PanaxGamesRu

Эта папка содержит практическую шпаргалку по устройству расширения **PANAX RU** (`PanaxGamesRu`), чтобы при следующих правках не ломать сборку, стили, виджеты и загрузку данных.

---

## 1. Рабочая директория и ветка

- Активный репозиторий: `C:\Users\arist\Gemini\PanaxGamesRu`
- Рабочая ветка на GitHub: `EditorT` (`Nikitamce/PanaxGamesRu`)
- После любых правок в `src/` **обязательно** пересобирать бандлы:
  - `npm run build` (`node scripts/build.mjs`) — собирает `content-main.js`, `content.js` и `gamequill/bridge.js`.
  - `npm run pack` (`node scripts/pack.mjs`) — упаковывает `panax-ru.zip`.
  - `node --check gamequill/app.js` — быстрая проверка синтаксиса редактора.

---

## 2. Структура проекта и что где лежит

- `manifest.json` — манифест расширения MV3. В `web_accessible_resources` открыты ресурсы (в т.ч. `ratings/*.png`), поэтому `chrome.runtime.getURL('ratings/...')` работает и внутри iframe редактора, и на страницах `panaxgames.com`.
- `src/shared/gq-schema.js` — нормализация и валидация данных обзора (`normalizeReview`, `safeImageUrl`, `IMAGE_HOSTS`, `widgetData`).
  - **Важно:** любой новый хост картинок (например `d21t60rno19oyf.cloudfront.net`) должен быть в `IMAGE_HOSTS`, иначе `safeImageUrl` вырежет обложку при сохранении/экспорте.
- `src/shared/gq-demo.js` — демо-данные (`DEMO_GAME`, `makeDemoReview`).
- `src/gamequill/bridge-core.js` — чистые адаптеры данных (`adaptPanaxSearch`, `panaxCoverUrl`, `adaptSteamSearch`, `adaptSteamDetails`, `mergeDetails`).
- `src/gamequill/bridge.js` — мост `window.GQ` для редактора: поиск и загрузка деталей с PANAX и Steam (`panaxSearch`, `panaxDetails`, `panaxResolveGame`, `steamSearch`, `steamDetails`), импорт обзоров (`importReviewFromUrl`, `importReviewFromText`), экспорт поста (`exportForPost`).
- `src/gamequill/review-importer.js` — парсеры импорта обзоров со StopGame, Steam (HTML и BBCode) и произвольных страниц. Подробная документация: [ai/review-importer.md](file:///C:/Users/arist/Gemini/PanaxGamesRu/ai/review-importer.md).
- `gamequill/app.js` и `gamequill/app.css` — UI-редактор обзоров (iframe), вставка и предпросмотр блоков. **Это исходники редактора напрямую** (не перезаписываются `build.mjs`, в отличие от `gamequill/bridge.js`).
- `src/content/gamequill/render.js` и `src/content/gamequill/render.css` — рендер опубликованных виджетов на сайте `panaxgames.com` (собирается в `content.js`).

---

## 3. Как устроены виджеты карточек игр (GameQuill)

Поддерживаются 6 вариантов `variant`:
- `classic` — стандартная карточка с обложкой и ссылками.
- `duet`, `editorial`, `staircase`, `type`, `brutal` — 5 дизайнерских карточек на основе прототипов из `designs/`.

### Правила, чтобы дизайн не ломался:
1. **Тёмная тема (`panax-dark`)**: правило фона в `gamequill/app.css` и `src/content/gamequill/render.css` должно быть привязано **только** к `.w-game.v-classic`, а не к `.w-game` целиком. Иначе фиолетовый градиент перекроет светлые карточки.
2. **Специфичность в `render.css`**: на странице поста действует `.blk a:not(.game-chip)` — поэтому ссылки `.panax-link` и `.br-link` внутри карточек должны иметь более высокую специфичность (например `.wrap .blk .w.w-game.v-* a.panax-link`).
3. **Иконки реакций**:
   - Для `duet` используются PNG-бейджи `ratings/*-on.png` (`legendary-on.png`, `awesome-on.png`, `good-on.png`, `decent-on.png`, `dislike-on.png`, `awful-on.png`), сбрасывая стили глобального класса `.badge`.
   - Если `chrome.runtime.getURL` недоступен (например, вне контекста расширения), используется fallback на эмодзи.
4. **Тумблер иконок оценок в PANAX-карточках (`showRatingIcons`)**: подробная архитектура и список файлов описаны в [ai/panax-rating-icons-toggle.md](file:///C:/Users/arist/Gemini/PanaxGamesRu/ai/panax-rating-icons-toggle.md).

---

## 4. Как подтягиваются игры и оценки с PANAX

1. **Поиск (`panaxSearch`)**:
   - Эндпоинт: `https://panaxgames.com/search/autocomplete?q=...&platform_integration=true`
   - Без заголовка `x-anonymous-user-token` возвращает `401`. Токен зашит в `PANAX_ANON_TOKEN` в `src/gamequill/bridge.js`.
   - Поле `cover` часто приходит коротким именем файла (`co4jni.jpg`), поэтому всегда прогоняется через `panaxCoverUrl(...)` → `https://d21t60rno19oyf.cloudfront.net/images/t_cover_big/<file>`.
2. **Детали и проценты реакций (`panaxDetails`)**:
   - Страница `https://panaxgames.com/game-detail/<id>` в SSR не содержит готовых процентов в DOM — проценты считаются на клиенте из Next.js flight payload (`"gameDetails":{...}`).
   - `extractFlightGameDetails` достаёт JSON `gameDetails`, читает `rating_legendary_cnt`, `rating_awesome_cnt`, `rating_good_cnt`, `rating_decent_cnt`, `rating_dislike_cnt`, `rating_awful_cnt` (и `rating_total_cnt`) и переводит их в проценты с округлением до 0.1%.
3. **Универсальная подгрузка (`GQ.panaxResolveGame`)**:
   - Работает и для игр из поиска PANAX, и для игр из Steam (ищет по названию + году).
   - В `gamequill/app.js` авто-гидрация запускается в `drawDetail()`, при `commit('game', ...)` и в `renderBlocks()` (`hydrateReviewGameBlocks`) для уже вставленных блоков с `0%`.

---

## 5. Переводы и UI-локализация (`panaxgames.com`)

(Раздел дополнен по материалам `c1106c5:ai/README.md` / `origin/RuAndScripts`.)

- **Как работает перевод**: контент-скрипты (`src/content/` → собираются в `content.js` и `content-main.js`) переводят UI-строки сайта, плейсхолдеры (`placeholder`, `data-placeholder` в `contenteditable`), уведомления (`paintNotice`), даты, фильтры, вкладки профиля и карточки обогащения игр (`/game-detail/*`).
- **Перевод постов и комментариев**: кнопка `Translate` (`src/content/features/post-translate.js`) — не искать просто `<p>`, так как Panax рендерит посты/рецензии/комментарии в специфичных контейнерах.
- **Добавление новой строки перевода**: см. пошаговую инструкцию в [ai/new-string.md](file:///C:/Users/arist/Gemini/PanaxGamesRu/ai/new-string.md).
- **Жёсткие запреты при переводе**:
  - Не переводить пользовательский прозаический текст (тела постов/комментариев) автоматической заменой UI-словаря — только явные UI-элементы или по кнопке `Translate`.
  - Не ломать пробелы внутри `<span>` в уведомлениях/ссылках.
- **Иконки и подписи реакций в виджетах**:
  - `legendary` → `Легенда` (`#f3cb16`, `🏆`)
  - `awesome` → `Круто` (`#f2a000`, `🤘`)
  - `good` → `Хорошо` (`#bd55e9`, `😄`)
  - `decent` → `Норм` (`#3c9df3`, `✋`)
  - `dislike` → `Плохо` (`#8ea6af`, `😞`)
  - `awful` → `Ужас` (`#e34d68`, `🤢`)

---

## 6. Чек-лист перед ответом пользователю

1. Проверить `node --check gamequill/app.js`.
2. Выполнить `npm run build` и `npm run pack`.
3. Закоммитить изменения с автором `Nikitamce` (`187407575+Nikitamce@users.noreply.github.com`) и запушить в `EditorT` через `git credential-manager get` (без интерактивных окон).
4. Напомнить пользователю обновить расширение в `chrome://extensions`.
