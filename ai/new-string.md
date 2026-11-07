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

## 3. Если React возвращает английский уже после обхода

Файл: `src/content/write-patch.js`, массив `pairs`:

```js
['English text from the site', dict['English text from the site'] || 'Русский текст'],
```

## 4. Версия

Один и тот же номер:

- `package.json`
- `scripts/build.mjs`
- две строки в `src/content/main.js` (`PANAX RU` и `` v ``)

```
Set-Location C:\Users\arist\Grok\panax-ru; npm run build
```

В `dist/content.js` поиском должна найтись новая строка бейджа.
