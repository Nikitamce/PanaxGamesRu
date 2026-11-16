# Импорт обзоров игр с внешних сайтов (StopGame, Steam, BBCode, HTML, файлы)

Документация для разработчика / другого ИИ по устройству механизма переноса обзоров в редактор **GameQuill** через кнопку **«⬆ Импорт»**.

---

## 1. Общая архитектура и поток данных

Механизм импорта состоит из трёх уровней:

1. **UI-слой (`gamequill/index.html`, `gamequill/app.css`, `gamequill/app.js`)** — модалка `#impModal` с тремя вкладками:
   - `🌐 По ссылке` (ввод URL обзора + опции `addGameCard`, `extractMeta`)
   - `📋 BBCode / HTML / текст` (вставка исходного кода или скопированного текста + опциональные поля `Игра`, `Заголовок`, `Вердикт`, `Оценка`)
   - `📄 Из файла` (выбор файла через `#fileIn` или drag&drop: `.json`, `.gq`, `.html`, `.htm`, `.txt`)
2. **Мост и сетевое обогащение (`src/gamequill/bridge.js`)** — загрузка HTML страниц через `fetchHtmlText`, вызов парсера, асинхронное обогащение виджетов (`PANAX` + `Steam` + `YouTube oEmbed` + `Steam Workshop`), нормализация в формат редактора через `toEditorReview(parsed, clean)`.
3. **Чистый парсер DOM/BBCode (`src/gamequill/review-importer.js`)** — безсетевой модуль, преобразующий HTML или BBCode в промежуточный объект обзора с блоками GameQuill.

---

## 2. Поток выполнения при импорте

### Вариант A: Импорт по ссылке (`GQ.importReviewFromUrl(rawUrl, opts)`)
1. `buildImportUrlCandidates(rawUrl)` строит список URL-кандидатов:
   - Для `stopgame.ru`: автоматически убирает случайный хвост `/browser` (например `.../review/22317/browser` → первым кандидатом идёт `.../review/22317`, вторым — исходный URL).
2. `fetchHtmlText(url)` в `src/gamequill/bridge.js`:
   - Сначала вызывает `fetch(url, { credentials: "omit", cache: "no-store" })` прямо из страницы расширения (`chrome-extension://.../gamequill/index.html`, где работают `host_permissions` из `manifest.json`).
   - При ошибке сети делает fallback через `chrome.runtime.sendMessage({ type: "panax_xhr", details: { url, method: "GET" } })` (`background.js`).
3. `parseImportedReview(html, { ...opts, url, win: window })` автоопределяет формат (`detectReviewInputKind`) и запускает нужный парсер.
4. `enrichImportedReview(parsed, opts)` подтягивает внешние данные и возвращает `{ review, warnings, sourceKind, stats }`.

### Вариант B: Импорт из текста / BBCode / HTML (`GQ.importReviewFromText(rawText, opts)`)
1. `detectReviewInputKind(raw)` определяет тип входа:
   - HTML StopGame (`_review-content_` / `stopgame.ru/game/`)
   - HTML Steam (`id="ReviewText"` / классы `bb_h1`, `bb_table`, `bb_blockquote`, `bb_spoiler`, `bb_code`)
   - Steam BBCode (`[h1]..[h3]`, `[b]`, `[i]`, `[u]`, `[strike]`, `[spoiler]`, `[quote]`, `[code]`, `[list]`, `[olist]`, `[table]`, `[noparse]`, `[url=...]`)
   - Произвольный HTML (`<p>`, `<div>`, `<h1>..<h4>`, `<blockquote>`, `<ul>`, `<ol>`, `<figure>`, `<img>`)
   - Обычный текст (разбивается по двойным переносам на `text`, голые ссылки YouTube / Steam превращаются в виджеты)
2. Далее запускается тот же `enrichImportedReview(parsed, opts)`.

### Вариант C: Импорт из файла (`handleImportedFile` в `gamequill/app.js`)
1. Сначала пытается разобрать содержимое как JSON-экспорт **GameQuill** (`p.app === 'GameQuill' && p.reviews`, массив обзоров, одиночный `{ id, blocks }`, `{ review }`). Если получилось — сохраняет прежнее поведение импорта GameQuill (включая `p.integrations`).
2. Если файл не JSON (например сохранённый `.html` со StopGame/Steam или `.txt` с BBCode) — передаёт текст в `GQ.importReviewFromText(text, { addGameCard: true, extractMeta: true })`.

---

## 3. Как устроены парсеры в `src/gamequill/review-importer.js`

### 3.1. Общие утилиты очистки ссылок и текста
- **`unwrapExternalUrl(rawHref, baseUrl)`**:
  - Разворачивает редиректы StopGame вида `/to?https%3A%2F%2F...` через `decodeURIComponent`.
  - Разворачивает редиректы Steam вида `https://steamcommunity.com/linkfilter/?u=...`.
  - Разрешает относительные ссылки относительно `baseUrl` и прогоняет через `safeUrl`.
- **`cleanInlineNode` / `serializeInline`**:
  - Оставляет только поддерживаемые инлайн-теги (`b`, `strong`→`b`, `i`, `em`→`i`, `u`, `s`/`del`/`strike`→`s`, `code`, `mark`, `sub`, `sup`, `a`, `br`).
  - Удаляет `<script>`, `<style>`, `<svg>`, `<noscript>` и технический спан Steam `.bb_link_host` (`[www.ubisoft.com]`).
  - Ссылки StopGame на игры (`a.game-link[href*="/game/"]` или `^/game/[^/]+$`) превращает в чип `<a class="game-chip" href="https://stopgame.ru/game/..." target="_blank" rel="noopener">🎮 Название</a>` без внутреннего `<svg>`.
- **`extractStandaloneLinkWidget(containerEl, opts)`**:
  - Если блок/абзац содержит **только голый URL** без постороннего текста (`isBareUrl`: текст ссылки пустой или начинается с `http(s)://`), то автоматически превращает его в виджет:
    - YouTube (`youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`) → `{ type: "youtube", data: { url, cover: ytCover(watchUrl), ... } }`
    - Steam Store (`store.steampowered.com/app/ID`) → `{ type: "steam", data: { app, cover: steamCover(app), url, ... } }`
    - Steam Workshop (`steamcommunity.com/sharedfiles/filedetails/?id=ID`) → `{ type: "workshop", data: { url, ... } }`
  - **Важно:** осмысленные ссылки с человеческим текстом (например `Официальная страница игры в Steam`) в виджет НЕ превращаются — они остаются текстовыми ссылками! Также обращать внимание, что `ytCover(watchUrl)` в `bridge-core.js` принимает именно полный URL `https://www.youtube.com/watch?v=...`, а не голый ID.

### 3.2. Парсер StopGame (`parseStopGameHtml`)
StopGame использует CSS Modules с хешированными суффиксами классов (`_review-content_1bso0_681`, `_content-wrapper_1kppv_101` и т.п.), поэтому в селекторах везде используются префиксные матчи `[class*="_..._"]`:
- **Заголовок**: `div[class*="_review-content_"] h1, h1[class*="_title_"]`, fallback `<title>`.
- **Название игры**: `#sg-breadcrumbs a[href*="/game/"]`, `a[class*="_mobile-game-info_"]`, `div[class*="_left-column_"] a[href*="/game/"]` (строго ссылки на `/game/<slug>`, без `/reviews`, `/prices` и т.п.) или из `<title>` (`Отзыв об игре ... от пользователя`).
- **Оценка (`score`, 1..10)**:
  - Считает `<svg>` внутри `div[class*="_review-content_"] div[class*="_stars--filled_"]`: обычная звезда `+2`, звезда с `half` `+1` (5 звёзд = `10`).
  - Fallback: `detectScoreFromText` ищет в тексте фразы вида `оценка ... 10 из 10` / `9/10`.
  - По `score` выставляется `recommend` (`>=7` → `yes`, `>=5` → `neutral`, `>=1` → `no`).
- **Плюсы и минусы**: из `div[class*="_plus-minus_"]` по `span[class*="_plus-minus--plus_"]` и `span[class*="_plus-minus--minus_"]` заполняются `pros` и `cons`.
- **Контент (`div[class*="_content-wrapper_"]`)**:
  - `div[class*="_image-wrapper_"]` / `<figure>`: полноразмерный URL берётся из `a[href]` (или `img[src]`), подпись — из `div[class*="_caption_"]` (или `img.alt`), формируется блок `{ type: "image", data: { url, caption, alt, origin: "url", items: [...] } }`.
  - Короткие абзацы, целиком выделенные `<b>`/`<strong>` без знака препинания в конце (`isHeadingParagraph`), преобразуются в `h3` (а `Итог` / `Введение` / `Заключение` — в `h2`).
  - `h1`/`h2` → `h2`, `h3`/`h4` → `h3`, `blockquote` → `quote`, `ul`/`ol` → `text` со списком, `iframe` YouTube → `youtube`.

### 3.3. Парсер Steam HTML (`parseSteamReviewHtml`) и BBCode (`steamBbCodeToHtml` + `parseSteamBbCodeText`)
Оба пути сводятся к единому обходу DOM-контейнера `parseSteamContainer`:

1. **Конвертация BBCode → Steam HTML (`steamBbCodeToHtml`)**:
   - **Сначала** вырезаются в плейсхолдеры `\u0000GQ_PROT_N\u0000`:
     - `[noparse]...[/noparse]` → экранируется HTML, внутри теги `[b]`, `[h1]` и т.п. не парсятся и выводятся буквально.
     - `[code]...[/code]` → экранируется HTML и сохраняется в `<div class="bb_code">`.
   - Далее экранируются сырые `<>` и переводятся теги:
     `[table]` / `[tr]` / `[th]` / `[td]`, `[list]` / `[olist]` / `[*]`, `[quote=author]`, `[h1]..[h3]`, `[hr]`, `[spoiler]`, `[url=...]`, `[b]`, `[u]`, `[i]`, `[strike]`.
   - Голые URL YouTube / Steam / Workshop на отдельной строке оборачиваются в `<a class="bb_link">`, после чего `\n` преобразуются в `<br>` и восстанавливаются защищённые блоки.

2. **Метаданные страницы Steam (`parseSteamReviewHtml`)**:
   - **Игра и `appId`**: `.profile_small_header_location` (последняя крошка) или `<title>` (`Обзор ...` / `Review for ...`); `appId` из `/recommended/(\d+)` или ссылки на магазин в `#rightContents`.
   - **Вердикт**: `#ReviewTitle .ratingSummary` (`Рекомендую` / `Recommended` → `yes`, `Не рекомендую` / `Not Recommended` → `no`).
   - **Скрытый проверкой обзор**: если `#ReviewText` отсутствует и на странице баннер `"автоматической проверки контента"` / `"automated content check"`, выбрасывается ошибка с `code = "steam-hidden"`, и UI предлагает кнопку быстрого перехода на вкладку **«📋 BBCode / HTML / текст»**.
   - **Заголовок обзора**: если первый блок обзора — `h2` длиной ≤ 160 символов, он автоматически выносится в поле `title` обзора.

3. **Разбор элементов `#ReviewText` (`parseSteamContainer`)**:
   - `div.bb_h1`, `div.bb_h2` → `h2`; `div.bb_h3` → `h3`.
   - `blockquote.bb_blockquote` → `quote` (из `div.bb_quoteauthor` извлекается автор; английское `"Originally posted by ..."` приводится к `"Автор: ..."`).
   - `span.bb_spoiler` → `{ type: "spoiler", html, hidden: true }`.
   - `div.bb_code` → `{ type: "text", html: "<code>...</code>" }` с `<br>` вместо переводов строк.
   - `ul.bb_ul` / `ol` → чистый `<ul>`/`<ol>` без хвостовых `<br>` в `<li>`.
   - `hr` → `{ type: "divider", data: { style: 1 } }`.
   - `a.dynamiclink_box.workshop_item` → `{ type: "workshop", data: { title, author, game, url, cover } }`.
   - `iframe[src*="store.steampowered.com/widget/"]` → `{ type: "steam", data: { app, ... } }`.
   - **Таблицы (`div.bb_table` / `<table>`, функция `parseSteamTableEl`)**:
     - Если таблица содержит минимум 2 строки с колонкой вида `X/10` и коротким названием аспекта (`<= 50` симв.) — заполняет `aspects` обзора (`{ name, score, unrated: "unsure" }`); если в строке есть дополнительная колонка комментария (например `🌸 Великолепно`), также сохраняет компактную сводку в `text`.
     - Если маленькая таблица содержит `X/10` и `РЕКОМЕНДУЮ` / `RECOMMENDED` — обновляет `score` и `recommend`.
     - Иначе форматирует строки таблицы как аккуратный текстовый блок (`<b>Заголовок</b> — значение`).
   - Одиночные `<br>` склеиваются внутри абзаца, двойные `<br><br>` разделяют абзацы в отдельные блоки `text`.

### 3.4. Общий HTML парсер (`parseGenericHtml`)
Используется, если ссылка или скопированный HTML не относятся к StopGame / Steam: ищет `<article>` / `<main>` / блок с максимальной суммарной длиной `<p>`, переносит `h2`, `h3`, `p`, `blockquote`, `ul`/`ol`, `figure`/`img`, `iframe` YouTube.

---

## 4. Обогащение при импорте (`enrichImportedReview` в `src/gamequill/bridge.js`)

После парсинга (параллельно через `Promise.allSettled`):
1. **Главная карточка игры (`addGameCard !== false`)**:
   - Если `parsed.appId` или `parsed.game` заданы:
     - Ищет `appId` через `steamSearch(parsed.game)` (если не известен), затем подтягивает `steamDetails(appId)` (название, жанры, год, разработчик, обложка, ссылки).
     - Ищет игру на PANAX через `panaxResolveGame({ title, year })` (добавляет 6 реакций `panaxReactions`, ссылку на PANAX и метаданные).
     - Вставляет блок `{ type: "game", data }` в начало `blocks`.
2. **Виджеты Steam (`b.type === "steam"`)**: догружает актуальные цену, скидку, теги и дату через `steamDetails(b.data.app)`.
3. **Виджеты YouTube (`b.type === "youtube"`)**: догружает реальный заголовок и имя канала через `https://www.youtube.com/oembed?url=...&format=json`.
4. **Виджеты Мастерской Steam (`b.type === "workshop"`)**: если при анонимном запросе Steam не отдал `.dynamiclink_box` (была только голая ссылка `?id=...`), `fetchWorkshopMeta(url)` загружает HTML страницы Workshop и достаёт `.workshopItemTitle`, `meta[property="og:image"]`, `.apphub_AppName` и автора из `.creatorsBlock .friendBlockContent`.
5. **Финализация**: прогоняет документ через `toEditorReview(parsed, clean)` (`bridge-core.js`), которая нормализует все поля, санитизирует HTML через `gq-html.js` и расставляет уникальные `id`.

---

## 5. Разрешения и схема (`manifest.json`, `src/shared/gq-schema.js`)

- **`manifest.json` (`host_permissions`)**: добавлены:
  - `https://stopgame.ru/*`, `https://images.stopgame.ru/*`
  - `https://steamcommunity.com/*`, `https://images.steamusercontent.com/*`
  - `https://www.youtube.com/*`
- **`src/shared/gq-schema.js` (`IMAGE_HOSTS`)**: добавлены `images.stopgame.ru` и `images.steamusercontent.com`, чтобы `safeImageUrl` пропускал обложки игр и превью предметов Мастерской Steam. (Обычные картинки из текста и `image`-блоков проходят через `safeUserImageUrl` в `src/shared/gq-image.js`, где разрешены любые внешние `https:` URL).

---

## 6. Что проверять и где искать баги, если сайт изменил вёрстку

- **StopGame не находит текст или картинки**: смотреть классы `_review-content_`, `_content-wrapper_`, `_image-wrapper_`, `_caption_`, `_plus-minus_`, `_stars--filled_` в `parseStopGameHtml` (`src/gamequill/review-importer.js`). Если StopGame сменил имена классов — обновить соответствующие селекторы `[class*="_..._"]`.
- **Steam не грузится по URL**: если обзор скрыт антиспам-проверкой Steam (`steam-hidden`), пользователь всегда может переключиться на вкладку **«📋 BBCode / HTML / текст»** и вставить исходный BBCode из режима редактирования Steam.
- **Новая разметка в Steam BBCode**: добавлять правила в `steamBbCodeToHtml` и `parseSteamContainer` (`src/gamequill/review-importer.js`), помня о том, что санитайзер `src/shared/gq-html.js` пропускает только разрешённые теги (`B`, `I`, `U`, `S`, `CODE`, `MARK`, `A`, `BR`, `SPAN`, `UL`, `OL`, `LI`, `BLOCKQUOTE` и т.д.).
- **Не отображаются картинки после экспорта в PANAX**: проверить, не режет ли их хост функция `safeImageUrl` (`IMAGE_HOSTS` в `src/shared/gq-schema.js`) или `safeUserImageUrl` (`src/shared/gq-image.js`).
- **Сборка и проверка после любых правок**:
  ```powershell
  node --check gamequill/app.js
  npm run build
  npm run pack
  ```
