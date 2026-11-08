# PANAX RU — памятка для ИИ

Расширение Chrome MV3: `C:\Users\arist\Gemini\PanaxGamesRu`. Переводит **хром сайта** https://panaxgames.com/ на русский сразу, без перезагрузки страницы, добавляет блоки обогащения карточек игр (Steam, Metacritic, OpenCritic, Backloggd, ProtonDB, Steam Deck, онлайн игроков) и кнопки перевода (`Translate`) для постов, рецензий, комментариев и описаний игр. Пользователь ставит распакованное расширение из `dist`.

Язык ответов пользователю — русский. В коде комментарии можно оставлять короткими на английском, как в соседних файлах.

Текущая живая версия — та, что в **бейдже на сайте** (`#panax-ru-badge`, справа снизу) и в `dist/manifest.json`. Скриншот часто снят со старой сборки. Не говори, что правка уже у пользователя, пока `npm run build` не прошёл и в `dist/content.js` нет новой строки бейджа.

## Что это за проект

Интерфейс сайта и расширения карточек игр:
- Перевод: кнопки, меню, вкладки, плейсхолдеры, счётчики, даты, уведомления, ярлыки постов, редактор аватара, логотип, иконки оценок.
- Обогащение игр (`src/content/enrichment/`, `src/content/api/`): карточка магазина Steam (цены, скидки, конвертация валют, отзывы), оценки OpenCritic, Metacritic, Steam (% положительных) и **Backloggd** (`src/content/api/backloggd.js` — парсинг `https://www.backloggd.com/games/<slug>/`), статус Steam Deck / ProtonDB, текущий онлайн и пики игроков (SteamCharts), быстрые ссылки.
- Перевод текста постов, рецензий, комментариев и описания игры по клику (`src/content/features/post-translate.js`, `src/content/api/translate.js`): кнопка `<button type="button" class="panax-translate-btn panax-translate-btn--review" data-target-type="review" data-panax-ru-skip="1"><span>Translate</span></button>` в виде аккуратного тёмно-бирюзового бейджа/пилюли, которая переводит текст на русский язык (`clients5.google.com` + фоллбэк `MyMemory`) и переключает обратно (`Показать оригинал`).
- Настройки расширения (`src/popup.html`, `src/popup.js`, `src/content/settings.js`): выбор региона Steam Store (`cc`: KZ, RU, US, UA, TR, EU и др.), переключение валюты конвертации цен (`targetCurrency`: RUB, USD, EUR, KZT, UAH, TRY) или отключение конвертации (`showPriceConvert`), переключатели модулей оценок (`showRatings`), магазина Steam (`showSteamStore`), быстрых ссылок (`showQuickLinks`), онлайна (`showPlayerStats`) и кнопки перевода (`showTranslate`).

Не переводить автоматически (без клика по кнопке `Translate`):

- текст постов, рецензий, комментариев, названия игр;
- виджет SteamDB (остаётся английским);
- одиночные английские слова внутри текста поста (`Post`, `Like`, `On`, `To`, `And`, `playing`, `years`).

Пользователь явно ловил «his Пост was created». Слово `Post` в теле поста должно остаться английским. Вкладка **Posts** и заголовок страницы поста **Post** при этом переводятся в **Посты** и **Пост**.

## Как устроен перевод и обогащение

Один бандл `src/content/main.js` → `dist/content.js`. В манифесте он подключён дважды, оба с `document_start` и `all_frames`:

- мир `ISOLATED` — обход DOM, стили, иконки оценок, логотип, карточки обогащения `startEnrichment()` и кнопки перевода `startPostTranslate()` (здесь есть `chrome.runtime.sendMessage` к фоновому воркеру `background.js`);
- мир `MAIN` — перехват записей React (`write-patch.js`, `messages-patch.js`). Прототипы страницы патчит только MAIN. Патч в ISOLATED на React не влияет.

Слои, сверху вниз:

1. `src/locales/ru.json` — словарь точных английских строк. Его читает движок и каталог next-intl.
2. `src/content/time.js` — целые строки и фразы, которые надо перевести **даже внутри карточки поста**: даты, «6 likes», уведомления, ярлыки (`Off-Topic`, `News flash`), сортировки, `Filters: PC`. Сюда попадает то, что словарь не видит из‑за пропуска поста.
3. `src/content/engine.js` — обход DOM. Не ставит `textContent` на узел, внутри которого есть `svg` или `img`. Содержит `paintNotice` со сложной обработкой разрозненных тегов уведомлений.
4. `src/content/enrichment/game-enrichment.js` — внедрение карточек цен, оценок и онлайна строго на страницах игр (`/game-detail/*`).
5. `src/content/features/post-translate.js` — внедрение и обработка кнопки `Translate` / `Показать оригинал` для комментариев, постов, рецензий и описания игры.
6. `src/content/api/` — клиенты Steam (`steam.js`), Metacritic (`metacritic.js`), OpenCritic (`opencritic.js`), Backloggd (`backloggd.js`), ProtonDB (`protondb.js`), курсов валют (`fx.js`), перевода (`translate.js`). Запросы идут через `bgRequest` (`request.js`) в `background.js` (обход CORS).
7. `src/content/write-patch.js` — перехват `nodeValue` / `data` / `textContent` до отрисовки. Для жёсткого JSX, которого нет в каталоге.
8. `src/content/messages-patch.js` — подмена английских значений в каталогах next-intl на волокнах React.
9. `src/content/skip.js` — что считать постом и что считать хромом (`[data-panax-ru-skip]` проверяется до проверки `button`, чтобы движок не трогал кастомные кнопки расширения).
10. `src/content/styles.js` и `src/content/enrichment/enrichment.css` — вёрстка переведённых контролов, карточек обогащения и кнопки `.panax-translate-btn`.
11. `src/content/logo.js`, `src/content/rating-icons.js` — картинки.

Порядок в `translateText` и в `translateRaw`: сначала `translateTimestamp` → `translateTimeFragment` → `translateNotice` → `translateActivity` → `translateCount` → ярлыки редактора. Потом проверка «это пост, не трогать». Короткий ярлык, который должен жить на карточке поста, добавляй в `translateActivity` **до** этой проверки. Иначе лента его пропустит, а открытый пост переведёт.

## Архитектура маршрутов и DOM-структура Panax (КРИТИЧЕСКИ ВАЖНО!)

Знание точной структуры Next.js-компонентов Panax предотвращает поломку вёрстки и ложные срабатывания:

### 1. Маршрутизация URL (`location.pathname`)
- `/game-detail/<slug>` (например, `/game-detail/FFResonance?tab=about-game` или `?tab=player-data`) — **страница игры**. Карточки обогащения (`game-enrichment.js`) должны рендериться **ТОЛЬКО** когда `location.pathname.includes('/game-detail/')`!
- `/<число>` (например, `/301296`) — **это страница отдельного поста или рецензии (`initialPost`), а НЕ страница игры!** Ни в коем случае не добавляй `/^\/\d+$/` в `isGamePage()`, иначе карточки «Оценки критиков» и «Быстрые ссылки» появятся прямо посреди чужого поста!

### 2. Как Panax рендерит посты, рецензии и комментарии (почему нельзя искать просто `<p>`)
В Panax пользовательский текст **НЕ** лежит в обычных тегах `<p>`:
- **Обычный текст поста или рецензии** рендерится компонентом `TextDetector` (модуль `93327`), который создаёт:
  - обёртку `<div style="position: relative; width: 100%">` (или родительский `<div class="... whitespace-pre-wrap text-(--color-text-common-user-contents)">`),
  - внутри неё **скрытый дублирующий спан для замера высоты** `<span aria-hidden="true" style="position: absolute; visibility: hidden; ...">` (при извлечении текста для перевода его обязательно нужно удалять из клона через `[aria-hidden="true"]`, иначе текст задвоится!),
  - и видимый `<span style="... overflow-wrap: anywhere">`, внутри которого **каждое слово обёрнуто в отдельный `<span>`**.
- **Богатые рецензии и посты с картинками внутри текста** (например, лонгриды-обзоры) рендерятся Quill-компонентом `.delta-content-renderer` (модуль `44446`):
  - внутри `.delta-content-renderer > .content-wrapper > div` лежат дочерние текстовые `<span>`/`<div>` вперемешку с картинками `.media-item`.
  - Если просто перезаписать `innerHTML` всего `.delta-content-renderer`, **пропадут все иллюстрации рецензии**! Поэтому `translateDeltaRenderer` в `post-translate.js` переводит только текстовые блоки внутри `.delta-content-renderer`, не трогая `.media-item`, и снимает ограничение `max-h-[280px]` при показе перевода.
- **Ловушка со строкой лайков (`.num-liked` / `.like-num-text`)**:
  - Под панелью реакций на открытом посте/рецензии рендерится блок `.num-liked`, внутри которого лежит `<p class="like-num-text"><span>Nikitamce</span> и другим помогло</p>`.
  - Это **единственный `<p>`** в нижней части поста, и в нём есть латинский никнейм (`Nikitamce` — 9 латинских букв!).
  - Если искать текст поста через `card.querySelectorAll('p')`, скрипт схватит `.like-num-text` и переведёт `Nikitamce и другим помогло` → `Никитамдже и другим помогло`, проигнорировав сам обзор!
  - **Правило:** всегда исключай `.num-liked, .like-num-text, .buttons-post-smart, .buttons-review-smart, .post-game-tag, .attached-game-post, .top-text-post-compact, .spoiler-container, .comment-item-container` при поиске тела поста/обзора!

### 3. Точные селекторы и 4 точки вставки кнопки `Translate` (`src/content/features/post-translate.js`)
Кнопка создаётся функцией `createTranslateBtn('review')` с атрибутом `data-panax-ru-skip="1"` (чтобы движок перевода интерфейса не трогал текст кнопки):
```html
<button type="button" class="panax-translate-btn panax-translate-btn--review" data-target-type="review" data-panax-ru-skip="1"><span>Translate</span></button>
```
Куда именно она вставляется и что переводит:
1. **Комментарии (`.comment-item-container`)**:
   - **Что переводим (`__panaxTargetTextEl`)**: `.comment-content .text-content`.
   - **Куда вставляем кнопку**: внутрь нижней панели комментария `.comment-info` (рядом с кнопкой «Ответить» / лайками комментария).
2. **Посты в ленте и на отдельной странице поста (`/[id]`)**:
   - **Панель реакций**: `.buttons-post` (лежит внутри `.buttons-post-smart`).
   - **Корень карточки (`cardRoot`)**: `smartWrap.closest('div[class*="bg-(--color-bg-layer-01"]')`.
   - **Что переводим (`__panaxTargetTextEl`)**: результат `findPostOrReviewBodyEl(cardRoot)` (либо `.delta-content-renderer`, либо блок `TextDetector` с `--color-text-common-user-contents` / `overflow-wrap: anywhere`).
   - **Куда вставляем кнопку**: `bar.appendChild(btn)` внутрь `.buttons-post` (справа в ряду лайков/комментариев/закладки).
3. **Рецензии/обзоры в ленте, на странице игры и на отдельной странице рецензии (`/[id]`)**:
   - **Панель реакций**: `.buttons-review` (лежит внутри `.buttons-review-smart`).
   - **Корень карточки (`cardRoot`)**: `smartWrap.closest('div[class*="bg-(--color-bg-layer-01"]')`.
   - **Что переводим (`__panaxTargetTextEl`)**: результат `findPostOrReviewBodyEl(cardRoot)`.
   - **Куда вставляем кнопку**: `bar.appendChild(btn)` внутрь `.buttons-review`.
4. **Описание игры на странице `/game-detail/*`**:
   - **Что переводим**: блок описания игры (`#collapseSummary`, `[class*="GameDetail_description"]` или текстовый блок `TextDetector` на странице `/game-detail/*` вне карточек постов/рецензий).
   - **Куда вставляем кнопку**: в `<div class="panax-translate-wrap mt-2">` сразу после блока описания (`block.after(wrap)`).
- **Перехват клика в `capture`-фазе (`document.addEventListener('click', ..., true)`)**:
  - Карточки постов и рецензий в ленте имеют `onClick` на всей карточке, который вызывает `toPostDetail(id)` (переход на страницу поста).
  - Чтобы клик по кнопке `Translate` в ленте переводил текст на месте и **не открывал страницу поста**, обработчик клика в `post-translate.js` обязательно должен висеть с `useCapture = true` и вызывать `e.preventDefault(); e.stopPropagation();`.

## Куда класть новую строку перевода интерфейса

| Ситуация | Куда |
| --- | --- |
| Обычная фраза хрома, видна и в меню, и на странице | `ru.json` (ключ = английский текст как на сайте) |
| Ярлык поста, сортировка, фильтр, цель, дата, счётчик — в ленте не переводится, в открытом экране переводится | ещё и точное совпадение всей строки в `translateActivity` в `time.js` |
| Уведомления со сложной разметкой (слова разбиты по тегам `<span>`, скидки, распродажи, профиль) | `paintNotice` в `engine.js` (обход текстовых узлов через `TreeWalker`) + `translateNotice` в `time.js` |
| React рисует строку сам и через полсекунды она всё ещё английская | ещё и пара в `pairs` внутри `write-patch.js` |
| Ключ next-intl известен (лист вида `follow-common`) | `BY_KEY` в `messages-patch.js` |
| Фраза длиннее одного слова и это не ярлык | не добавляй её в «всегда переводить», она может встретиться в посте |

Дубли ключей в `ru.json` ломают сборку предупреждением esbuild. Перед вставкой поищи ключ. Уже есть, не добавляй снова: `Bookmarks`, `Edit profile`, `Recommended` (это не `Recommend`).

`en.json` в рантайме не используется. Правь `ru.json`.

Шаблон правки: `ai/new-string.md`.

## Сборка и проверка

PowerShell 5.1. Оператор `&&` нельзя. Не используй переменную `$path` (это `GraphicsPath`).

```powershell
npm run build
```

Сборку запускай **после последней правки** файлов. Иначе в `dist` останется предыдущая версия.

Версию подними в четырёх местах на один и тот же номер:

- `package.json` → `"version"`
- `scripts/build.mjs` → `version:`
- `src/content/main.js` → текст бейджа `PANAX RU x.y.z`
- `src/content/main.js` → `console.info` → `` v x.y.z ``

Потом снова `npm run build`. В `dist/content.js` должна быть строка `PANAX RU` с новым номером.

Пользователю каждый раз пиши:

1. папка распакованного расширения: `c:\Users\arist\Gemini\PanaxGamesRu\dist`;
2. на `chrome://extensions` нажать обновить (🔄);
3. на сайте Ctrl+Shift+R;
4. бейдж справа снизу должен показать новый номер.

Скрыть бейдж: хеш `#panax-ru-hide-badge`.

Сбор недостающих строк: открыть сайт с `#panax-ru-harvest`, в консоли `copy(window.__PANAX_RU_HARVEST__)`. Это английские куски короче 120 символов, которых нет в словаре. Среди них будет мусор из постов. В словарь клади только хром.

## Жёсткие запреты

Их уже ломали, пользователь каждый раз видел и просил вернуть.

- **Не меняй проверенную логику `findSectionCard` и `findMountTarget` в `game-enrichment.js` на общие фоллбэки вроде `document.body.firstElementChild` или `gameCol`!** Из-за такого фоллбэка панель «Активность сообщества и игроков» улетала в самый верх сайта над шапкой Panax, а карточки во вкладке «О игре» пропадали.
- **Не используй `/^\/\d+$/` в `isGamePage()`**: числовые URL (`/301296`) — это посты и рецензии, а не игры. `isGamePage()` должен проверять только `location.pathname.includes('/game-detail/')`.
- **Не ищи текст поста/рецензии через общий `querySelectorAll('p')`**: посты и рецензии рендерятся в `div`/`span` (`TextDetector` и `.delta-content-renderer`), а в `<p>` лежит строка `.like-num-text` («Nikitamce и другим помогло»).
- **Не забывай удалять `[aria-hidden="true"]` из клона при чтении текста `TextDetector`**: иначе скрытый спан для расчёта `line-clamp` удвоит переводимый текст.
- **Не вставляй кнопки `Translate` в боковые панели и шапку**: всегда исключай `aside, nav, header, footer` и опирайся только на `.comment-item-container`, `.buttons-post`, `.buttons-review` и описание на `/game-detail/*`.
- Не присваивай `textContent` узлу, внутри которого есть `svg` или `img`. Иконка пропадёт. Меняй только текстовый узел.
- Не пропускай все `<article>`. На странице игры в `article` сидит хром.
- Не используй селектор `[class*="tab-button"]`. Он совпадает с `.tab-button-container` и растягивает липкую полосу вкладок шире колонки. Расширять можно только `button.tab-button` и `.tab-button:is(button, a, [role="tab"])`.
- Не растягивай пилюли шапки и боковой навигации до `max-content`. Из‑за этого «Пространство» уезжало вправо.
- Широкий стиль `data-panax-ru="wide"` только у точных фраз: Follow back, Edit profile, Share profile, Connect PlayStation account, Connect Xbox account и их русских эквивалентов. Подзаголовок «What's buzzing» из‑за широкого стиля съезжал.
- Не перекрашивай превью уведомлений. Имя жирное белое, действие мелкое серое. Нельзя склеивать имя и действие в первый текстовый узел: вся строка становится белой и жирной. Это делает `paintNotice`: он трогает только шапку уведомления и останавливается перед длинным превью.
- Логотип не подменять через `replaceWith`. React возвращает SVG. Прячь пути стилем и рисуй PNG фоном у `svg[viewBox="0 0 83 32"]`. Фон: `center / contain`. Не увеличивай и не сдвигай: обрезка, пользователь просил откатить.
- Иконки оценок: смотри свежие `src` и `srcset`, не `currentSrc`. Иначе после клика возвращается английская картинка. Потом очищай `srcset`. Файлы сайта: `icon_*_text_on/off`. У awesome есть и `icon_awesome_v2_text_*`, и `icon_awesome_text_*`.
- «Impressions» нельзя проводить через путь, который ставит `textContent` на всю цветную плашку. Плашка теряет цвет. Переводи отдельный текстовый узел.
- Слова из `AMBIGUOUS_SHORT` в `skip.js` не переводи вне хрома. Туда входят Post, Like, On, To, And, Edit, Top, Create и другие короткие слова.
- `Edit`, `Top`, `Hair`, `Age`, `Custom` переводи только внутри `.edit-btn, .edit-label, .footer-btn, .floating-btn, .subtab-btn, .tab-btn`. Иначе «Edit» в посте станет «Изменить».

## Особые куски интерфейса

### Карточки обогащения игр (`/game-detail/*`)

Файлы: `src/content/enrichment/game-enrichment.js`, `src/content/api/` (`steam.js`, `metacritic.js`, `opencritic.js`, `backloggd.js`, `protondb.js`, `fx.js`, `request.js`).
1. **Только `Promise.allSettled`:** Внешние API могут блокироваться, отвечать 404 или сбрасывать соединение (например, OpenCritic API закрывает TLS-сокеты). Ни в коем случае не использовать `Promise.all`, иначе ошибка одного API заблокирует Steam, онлайн игроков, Backloggd и Metacritic.
2. **Оценки в карточке «Оценки критиков и совместимость» (`renderRatingsCard`):**
   - **OpenCritic**: тир (`Mighty`, `Strong`, `Fair`, `Weak`), балл и `% реком.`.
   - **Metacritic**: балл в цветном квадрате (`high` >= 75, `mid` >= 50, `low` < 50).
   - **Steam**: `👍 Steam: X%` (ссылка на `#app_reviews_hash`).
   - **Backloggd**: `★ X.X Backloggd` (парсится с `https://www.backloggd.com/games/<slug>/` через `fetchBackloggdRating` в `src/content/api/backloggd.js`, никаких фейковых «оценок Panax» быть не должно!).
   - **Steam Deck** и **ProtonDB**: бейджи совместимости.
3. **Регион Steam и конвертация валют (`fx.js`, `steam.js`, `settings.js`, `popup.html`, `popup.js`):**
   - В попапе расширения выбирается регион магазина Steam (`steamRegion`: `KZ`, `RU`, `US`, `UA`, `TR`, `EU`, `GB`, `AR`, `BR`, `CN`, `JP`) и целевая валюта (`targetCurrency`: `RUB`, `USD`, `EUR`, `KZT`, `UAH`, `TRY`), а также тумблер `showPriceConvert`.
   - При изменении настроек в `chrome.storage.local` слушатель `chrome.storage.onChanged` сбрасывает кэш и перерисовывает карточку Steam.
4. **Точки монтирования (`findMountTarget`):**
   - На вкладке «О игре» (`about`): ищет секции `how long to beat`, `платформы / platforms`, `нашли ошибку / предложить правку`, `об игре / about game`. Удаляет карточку онлайна игроков (`#panax-players-card-container`).
   - На вкладке «Данные игроков» (`players`): ищет `игроки с этой игрой / players with this game`, `как вам? / how was it?`, `оценки / ratings` или монтирует сразу под панелью вкладок `findTabsBar()`. Удаляет блок `#panax-about-enrichment`.
   - На вкладке «Сообщество» (`community`): удаляет оба блока обогащения, чтобы не мешать ленте постов игры.
5. **CORS и `host_permissions`:** все внешние запросы идут через `bgRequest` (`chrome.runtime.sendMessage({ type: 'panax_xhr' })` в `background.js`). В `scripts/build.mjs` в `host_permissions` обязательно должны быть прописаны `https://www.backloggd.com/*`, `https://clients5.google.com/*`, `https://translate.googleapis.com/*`, `https://api.mymemory.translated.net/*` и др.

### Вкладки профиля

Фразы: Posts, Reviews, Collections, Following games, Top, вместе с числом вроде `1.4K`. Реальный скроллер — `.tab-navigation-container` (у сайта спрятан скроллбар). Внешний `.tab-button-container` имеет `.gradient-overlay`, он затухает последнюю вкладку. Скроллбар принудительно показан на внутреннем контейнере, градиент скрыт. Пользователь просил ползунок, а не сужение русских подписей.

### Уведомления и распродажи (`paintNotice`)

В уведомлениях (`Обновления` / `Уведомления`) React часто раскладывает слова фразы по отдельным тегам `<span>`:
1. **Профиль**: `<span ...>Check your </span><a><span>profile</span></a><span ...>to </span><span ...>see </span>...`
   - Логика обходит все текстовые узлы: `Check your` → «Загляните в свой», `profile` → «профиль», а осколки `to`, `see`, `what's`, `new.` склеиваются в единый «, чтобы узнать, что нового.», затирая лишние спаны.
2. **Скидка**: `<span ...>is </span><span ...>сейчас </span><b>75%</b>`
   - Изолированные теги склеиваются в аккуратный бейдж `— скидка 75%`.
3. **Распродажи Steam**: `<span ...>Get </span><span ...>it </span>...<a>Steam</a>...<span ...>before </span><span ...>the </span><span ...>sale </span>...`
   - Обрабатываются все разрозненные спаны: «Купите в», ссылка «Steam», «за $X», «до окончания скидки», «9 ноября». Лишние слова (`the`, `ends`, `on`) корректно глушатся без поломки вёрстки.
4. **Социальные действия**: `splitNotice` возвращает имя и русское действие отдельно. Имя остаётся в своём узле. Примеры: «Name and N others liked your post» → имя + «и ещё N человек оценили»; «started following» целиком; «X and others got help» → «X и другим помогло». «This comment has been deleted.» переводится. Удалённый комментарий и обычный оба серые, не белые.

### Редактор аватара

Кнопки одежды около полусекунды оставались английскими: редкий повторный обход (`n` между 120 и 240 — раз в 600 мс) догонял их после отрисовки. Сейчас текст этих кнопок прозрачный, пока нет `data-panax-ru-on`, а MAIN-мир переводит их в `requestAnimationFrame` до кадра. Класс часто появляется позже текста, поэтому есть и `MutationObserver` на `class`. Не снимай этот CSS и не выкидывай цикл кадров, иначе вспышка вернётся.

`Custom` → «Своё».

### Ярлыки постов

Цветная плашка под постом в ленте сидит в пропущенном корне, поэтому словарь её не видит. На открытом посте тот же текст уже вне корня и переводится. Лечится точным совпадением всей строки в `translateActivity`. Уже есть: Tips, Ask, LFG, Flex, Quiz, Impressions, Moments, Rant, Deal, Off-Topic, Meme, Haul, Spoiler, News flash. Новую плашку добавляй так же, целиком, не по словам.

### Сортировка и фильтры

Recommend, Random, Most rated, Most reviewed, Most GOTY awards, Old release, A-Z, Z-A, `Filters: …`, фраза цели «The first goal is right in front of you!». PC, PS4, XB1, PlayStation 4, Xbox One не переводи.

### Даты

«Sep 11», «· 1d ago», «Added 144 days ago» (даже если перед этим короткое название). Название игры перед датой не переводи. `translateTimestamp` вызывается и внутри пропущенных корней.

## Карта файлов

- `src/content/main.js` — старт, бейдж, таймеры обхода, вызов патчей, `startEnrichment` и `startPostTranslate`.
- `src/content/engine.js` — обход, `paintNotice` (включая пословные спаны уведомлений и распродаж), ярлыки редактора, широкие кнопки.
- `src/content/time.js` — даты, счётчики, уведомления (`translateNotice`, `translateTimeFragment`), ярлыки, сортировки.
- `src/content/enrichment/game-enrichment.js` — карточки цен Steam, оценок критиков (OpenCritic, Metacritic, Steam, Backloggd), онлайна и быстрых ссылок на `/game-detail/*`.
- `src/content/enrichment/enrichment.css` — стили карточек обогащения, бейджей оценок и кнопки `.panax-translate-btn`.
- `src/content/features/post-translate.js` — поиск текста постов/рецензий/комментариев/описаний игр, вставка кнопки `Translate` и перевод без потери иллюстраций.
- `src/content/api/` — API Steam (`steam.js`), Metacritic (`metacritic.js`), OpenCritic (`opencritic.js`), Backloggd (`backloggd.js`), ProtonDB (`protondb.js`), курсы валют (`fx.js`), переводчик (`translate.js`), обёртка запросов (`request.js`).
- `src/content/settings.js` — хранение и синхронизация настроек расширения (`chrome.storage.local`).
- `src/popup.html`, `src/popup.js` — интерфейс настроек расширения (регион Steam, валюта конвертации, переключатели блоков).
- `src/background.js` — Service Worker для выполнения кросс-доменных запросов (CORS).
- `src/content/skip.js` — корни постов (`[data-panax-ru-skip]`), проверка контекста хрома (`isChromeContext`) и короткие опасные слова (`AMBIGUOUS_SHORT`).
- `src/content/write-patch.js` — перехват записей React и кадр редактора одежды.
- `src/content/messages-patch.js` — каталог next-intl.
- `src/content/observer.js` — MutationObserver и редкий повторный обход.
- `src/content/styles.js` — вкладки, широкие кнопки, скроллбар, скрытие английского в редакторе.
- `src/content/logo.js` — русский логотип фоном SVG.
- `src/content/rating-icons.js` — подмена иконок оценок.
- `src/locales/ru.json` — словарь.
- `scripts/build.mjs` — esbuild и генерация `dist/manifest.json`.
- `assets/logo/panax-logo.png` — слово «Панакс», чёрный фон оставлен специально.
- `assets/ratings/` — иконки 256px. В `dist` их копирует сборка. `web_accessible_resources`: `ratings/*.png`, `logo/*.png`.

## Как отвечать пользователю

Он присылает скрин и кусок HTML. Сделай перевод или доработку, подними версию, собери, напиши номер бейджа и три шага обновления. Не проси его самого править код.

Если бейдж на скриншоте старый, правка могла уже быть в `dist`, а страница нет. Сначала сверь бейдж и `dist`, потом ищи новый баг.

Не расширяй задачу: не трогай логотип, цвета уведомлений и тексты постов, если об этом не попросили.
