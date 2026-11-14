# PANAX RU — восстановленные исходники

Расширение Chrome (MV3): русификация panaxgames.com без перезагрузки + игровые виджеты (OpenCritic, Steam, Metacritic, ProtonDB, SteamCharts) + встроенный редактор обзоров GameQuill.

## Структура

- `manifest.json`, `background.js`, `popup.html`, `popup.js` — исходники (не бандлились).
- `content.js`, `content-main.js`, `gamequill/bridge.js` — собранные esbuild-бандлы.
- `gamequill/app.js`, `gamequill/index.html`, `gamequill/app.css` — исходники iframe-приложения GameQuill.
- `src/` — модули, извлечённые обратно из бандлов по маркерам `// src/<путь>`.
- `src-content-main/`, `src-bridge/` — варианты модулей `src/shared/*`, отличающиеся между бандлами (tree-shaking урезал неиспользуемое в каждом бандле).

## Работа с инструментами

```bash
npm run extract   # разобрать бандлы -> src/ (перезаписывает src/!)
npm run build     # собрать бандлы обратно и сверить sha256 с оригиналами
```

`npm run build` восстанавливает все три бандла **побайтово** (проверено sha256).
Метаданные для пересборки (порядок модулей, var-имена JSON/CSS-модулей,
сырые строки шаблонных литералов, хвостовые пустые строки) — в `tools/bundles.json`.

## Ограничения

Модули в `src/` — это тела модулей в том виде, как их слепил esbuild:
перекрёстные импорты уже разрешены в общую область видимости, собственных
`import/export` нет. Для чтения и навигации по коду это полноценные исходники;
для полноценной esbuild-сборки из ES-модулей потребуется дополнительный шаг —
восстановление графа импортов (переименования esbuild необратимы не полностью).

`src/locales/ru.json` — настоящий JSON (читаемый), при сборке сериализуется
ровно в тот формат, что использует esbuild.
`src/content/enrichment/enrichment.css`, `src/content/gamequill/render.css` —
сырой CSS; выбор кавычек (`"` vs `` ` ``) эмулирует printer esbuild.
