# Реализация тумблера «Иконки оценок PANAX» (`showRatingIcons`)

Документация для разработчика / другого ИИ о том, как в редакторе **GameQuill** и на страницах `panaxgames.com` реализован индивидуальный переключатель (вкл/выкл) отображения русифицированных логотипов реакций из папки `ratings/` в виджетах категории **PANAX**.

---

## 1. Задача и принцип работы

У карточек игр (`block.type === "game"`) из категории **PANAX** реакции сообщества (`Легенда`, `Круто`, `Хорошо`, `Норм`, `Плохо`, `Ужас`) ранее выводились либо с эмодзи (`🏆`, `🤘`, `😄`, `✋`, `😞`, `🤢`), либо только текстом. Исключением был вариант `duet`, где значки `ratings/*-on.png` встроены в макет.

Теперь у каждого такого виджета есть независимый булевый флаг **`showRatingIcons`** (по умолчанию `false`), который:
1. Хранится в данных блока `game` (сохраняется в посте, в `gq-native` v2, при экспорте/импорте JSON).
2. Переключается пользователем в двух местах в редакторе `gamequill/app.js`:
   - В окне выбора/редактирования виджета (под выпадающим списком **«Дизайн карточки»**).
   - Прямо на уже вставленном виджете (кнопка-тумблер **«Иконки»** в `.w-tools` рядом с `✎` и `✕`).
3. Одинаково рендерится как в предпросмотре редактора (`gamequill/app.js`), так и в опубликованном посте на `panaxgames.com` (`src/content/gamequill/render.js` и `src/shared/gq-cards.js`).

---

## 2. Ресурсы иконок (`ratings/`)

В папке `ratings/` (открыта в `manifest.json` через `web_accessible_resources`) лежат PNG-логотипы:
- `ratings/legendary-on.png` — **Легенда** (`#f3cb16`)
- `ratings/awesome-on.png` — **Круто** (`#f2a000`)
- `ratings/good-on.png` — **Хорошо** (`#bd55e9`)
- `ratings/decent-on.png` — **Норм** (`#3c9df3`)
- `ratings/dislike-on.png` — **Плохо** (`#8ea6af`)
- `ratings/awful-on.png` — **Ужас** (`#e34d68`)

Пути формируются в двух окружениях:
- В контентном скрипте на сайте (`src/content/gamequill/render.js`, `badgeSrc`): через `chrome.runtime.getURL("ratings/...")`.
- В iframe редактора (`gamequill/app.js`, `rxBadgeSrc`): через `chrome.runtime.getURL("ratings/...")` с fallback на `../ratings/...`.

---

## 3. Изменения по файлам

### 3.1. Схема данных — `src/shared/gq-schema.js`
В `widgetData(type, d)` для `type === "game"` добавлено поле:
```js
showRatingIcons: !!d.showRatingIcons
```
Это гарантирует, что флаг не вырезается при нормализации документа (`normalizeReview`), при сохранении в `gq-native` v2 и при импорте/экспорте.

### 3.2. Мост редактора — `src/gamequill/bridge.js`
Из `../shared/gq-cards.js` импортирована и проброшена в глобальный объект `window.GQ` функция `isPanaxCardVariant(id)`, чтобы `gamequill/app.js` определял принадлежность любого из 47+ дополнительных шаблонов к категории `panax` без дублирования списка ID.

### 3.3. Шаблонные и дополнительные карточки — `src/shared/gq-cards.js`
Охватывает все 47 карточек с `cat: "panax"` (`glm-panax-*`, `gpt-*`, `twp-*`, `son-*`, `panax4-*`, `qwen-*`, `qwen2-*`):

1. **`isPanaxCardVariant(id)`**:
   Проверяет вхождение `id` в базовые PANAX-варианты (`duet`, `editorial`, `staircase`, `type`, `brutal`) или в множество `EXTRA_VARIANTS` с `cat === "panax"`.
2. **`extractCardMetrics(d, rxList)`**:
   Добавляет в метрики `M` поле `showRatingIcons: !!d.showRatingIcons`.
3. **`fillTemplate(raw, M)`**:
   При `M.showRatingIcons === true` плейсхолдеры `__TOP1_ICON__` и `__RX_ICON_0..5__` вместо эмодзи заменяются на `<img class="gq-rx-ico" src="..." alt="..." loading="eager">`.
4. **`injectPanaxRatingIcons(html, rxList)`**:
   Универсальный пост-процессор для шаблонов, в которых названия реакций написаны текстом без `__RX_ICON_*__` (например, `qwen-*`, `qwen2-*`, `twp-*`, `son-*`, `gpt-*`, `glm-panax-swiss`, `glm-panax-crt` и др.):
   - Разбивает HTML на теги (`<[^>]*>`) и текстовые сегменты (`[^<]+`), чтобы **никогда не трогать атрибуты тегов** (`title`, `alt`, `style` и т.д.).
   - Отслеживает глубину вложенности `skipDepth` для тегов `style`, `script`, `svg`, `title`, `a`, `button` — внутри них иконки не вставляются.
   - Отслеживает класс `pa01-lbl` / `pa02-lbl` / `pa05-lbl`: в этих шаблонах иконка уже вставлена через `__RX_ICON_i__` в соседний `.pa0*-badge`, поэтому рядом с `.pa0*-lbl` дубликат не ставится.
   - В остальных текстовых сегментах находит целые слова `Легенда`, `Круто`, `Хорошо`, `Норм`, `Плохо`, `Ужас` (без учёта регистра) и вставляет перед ними `<img class="gq-rx-ico sm" src="..." alt="" loading="eager">`.
5. **`renderExtraGameCard(variantId, d, tools, rxList)`**:
   Для `qwen-` и `qwen2-` рендерит тело карточки без `tools`, при `M.showRatingIcons && isPanaxCardVariant(variantId)` прогоняет тело через `injectPanaxRatingIcons`, а затем вставляет `tools` сразу после открывающего корневого `<div>`. Для `TEMPLATES` аналогично прогоняет `fillTemplate` до склейки с `tools`. Это гарантирует, что текст кнопок `tools` не затрагивается.

### 3.4. Базовый рендер на сайте — `src/content/gamequill/render.js`
Для встроенных PANAX-вариантов:
- Введён helper `rxIconEl(x, cls)`: при `d.showRatingIcons && x.badge` возвращает `<img class="${cls}" src="${x.badge}" alt="${x.name}" loading="eager">`, иначе `x.icon`.
- **`editorial`**: иконка вставляется в `.ed-feature-main` (`gq-rx-ico lg`) и в строки `.ed-row` (`gq-rx-ico`).
- **`staircase`**: иконка вставляется в `.step-cap` (`gq-rx-ico`).
- **`type`**: иконка вставляется в `.type-symbol` (`gq-rx-ico`).
- **`brutal`**: иконка вставляется перед текстом лидера `.br-leader` (`gq-rx-ico lg`) и перед названием каждой реакции в таблице `.br-cname` (`gq-rx-ico sm`).
- **`duet`**: иконки в `.duet-choice` остаются всегда как часть исходного дизайна Дуэта.

### 3.5. Интерфейс редактора — `gamequill/app.js`
1. **`isPanaxCardVar(v)`**:
   Возвращает `true` для `editorial`, `staircase`, `type`, `brutal` и всех вариантов, для которых `GQ.isPanaxCardVariant(v)` истинно (кроме `classic` и `duet`).
2. **Тумблер прямо на вставленном виджете (`widgetHTML` и обработчик `#blocksList`)**:
   - Если `b.type === 'game' && isPanaxCardVar(d.variant)`, в `.w-tools` добавляется кнопка:
     `<button type="button" class="wt wt-rx..." data-act="rx-icons">...</button>`
   - Клик по `data-act="rx-icons"` инвертирует `b.data.showRatingIcons`, вызывает `renderBlocks()` и `touch()`.
3. **Тумблер в модалке вставки/редактирования (`openInsert`, `drawDetail`)**:
   - `openInsert` считывает `showRatingIcons` из редактируемого блока в `insCtx.showRatingIcons`.
   - В `drawDetail` под `#gCardVarDd` добавлен `<label class="gq-rx-toggle" id="gRxIconsRow">` с чекбоксом `#gRxIcons`.
   - Видимость `#gRxIconsRow` синхронизируется функцией `syncRxToggle(v)` при смене дизайна карточки (`flex` для PANAX-дизайнов, `none` для числовых).
   - Переключение `#gRxIcons` обновляет `insCtx.showRatingIcons` и мгновенно перерисовывает открытое превью карточки (`#gCardVarPreview`).
   - Значение `showRatingIcons: !!insCtx.showRatingIcons` передаётся в превью вставки (`showInsPreview`) и при сохранении (`commit('game', ...)`).
4. **Синхронизация базовых карточек в `renderGameCard`**:
   В `editorial`, `staircase`, `type`, `brutal` применена та же логика `rxIconHtml`, что и в `render.js`.

### 3.6. Стили — `src/content/gamequill/render.css`, `src/shared/gq-cards.css`, `gamequill/app.css`
- Для `img.gq-rx-ico` (и модификаторов `.sm`, `.lg`) заданы явные размеры (`18px`/`15px`/`28px` в базовых карточках и `16px`/`14px`/`24px` в extra-шаблонах) и сброшены `border-radius`, `border`, `background`, `box-shadow`, `padding`, `margin` с `!important`, чтобы общие правила карточек для `img` не искажали прозрачные PNG-значки.
- В `render.css` и `app.css` для `.v-brutal .br-cname` и `.br-leader` добавлено flex-выравнивание.
- В `app.css` добавлены стили тумблеров `.gq-rx-toggle` / `.gq-rx-switch` и `.wt-rx` / `.wt-sw`.

---

## 4. Как проверять после правок

1. Синтаксис редактора:
   ```powershell
   node --check gamequill/app.js
   ```
2. Сборка бандлов и архива:
   ```powershell
   npm run build
   npm run pack
   ```
3. Автопроверка схемы и всех 47 дополнительных карточек `cat: "panax"`:
   - `normalizeReview` должен сохранять `showRatingIcons: true`.
   - При `showRatingIcons: false` в HTML не должно быть `gq-rx-ico`.
   - При `showRatingIcons: true` во всех 47 PANAX-шаблонах должны появляться `gq-rx-ico` / `ratings/`.
4. В браузере:
   - Обновить расширение в `chrome://extensions`.
   - Открыть редактор GameQuill → выбрать игру → выбрать любой дизайн из вкладки **PANAX** → проверить, что появляется тумблер **«Иконки оценок PANAX»** и меняет превью.
   - Вставить карточку → проверить, что на самой карточке при наведении работает кнопка-тумблер **«Иконки»**.
   - Опубликовать / экспортировать и открыть пост на `panaxgames.com` → убедиться, что иконки `ratings/*-on.png` отображаются так же, как в редакторе.
