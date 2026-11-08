# Шаблон: новая английская строка

Подставь текст с сайта один в один, включая апостроф и регистр. Потом подними версию по `ai/README.md` и собери проект.

## 1. Словарь

Файл: `src/locales/ru.json`. Ключ ещё не должен существовать.

```json
"English text from the site": "Русский текст"
```

## 2. Если строка на карточке поста, в ленте или в меню и словарь её не берёт

Файл: `src/content/time.js`, функция `translateActivity`, объект рядом с `news flash`.

Короткий ярлык, вся строка целиком:

```js
'news flash': 'Молния',
```

Фраза с хвостом (платформу не переводи):

```js
const filters = text.match(/^filters:\s*(.+)$/i);
if (filters && text.length < 80) return `Фильтры: ${filters[1]}`;
```

Не добавляй одно слово, которое бывает в предложении поста (`Post`, `Like`, `On`, `To`, `And`).

## 3. Если строка в уведомлениях разбита React на отдельные теги `<span>`

В уведомлениях (`Обновления` / `Уведомления`) React часто рендерит текст **пословно** в отдельные теги:
- `<span>Check your </span><a><span>профиль</span></a><span>to </span><span>see </span>...`
- `<span>is </span><span>сейчас </span><b>75%</b>`
- `<span>Get </span><span>it </span>...<span>before </span><span>the </span><span>sale </span><span>ends </span>...`

Файл: `src/content/engine.js`, функция `paintNotice`.
Логика должна обрабатывать цепочку текстовых узлов через `TreeWalker` по всей строке уведомления, собирая смысловые части воедино и затирая пустые/лишние осколочные теги.

Также проверь `translateNotice` и `translateTimeFragment` в `src/content/time.js`.

## 4. Если React возвращает английский уже после обхода

Файл: `src/content/write-patch.js`, массив `pairs`:

```js
['English text from the site', dict['English text from the site'] || 'Русский текст'],
```

## 5. Версия и сборка

Один и тот же номер:

- `package.json`
- `scripts/build.mjs`
- две строки в `src/content/main.js` (`PANAX RU` и `` v ``)

Сборка:
```powershell
npm run build
```

В `dist/content.js` поиском должна найтись новая строка бейджа.
