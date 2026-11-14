<div align="center">

<img src="icons/128.png" alt="PANAX RU Logo" width="112" height="112" />

# PANAX RU — Русский интерфейс, переводы и GameQuill для panaxgames.com

![Version](https://img.shields.io/badge/version-0.3.5-7c5cff?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-V3-22d3ee?style=for-the-badge)
![Build](https://img.shields.io/badge/build-esbuild-f2a000?style=for-the-badge)
![Branch](https://img.shields.io/badge/branch-EditorT-10b981?style=for-the-badge)

**Полная русификация интерфейса `panaxgames.com`, встроенный переводчик постов и рецензий, кастомные иконки оценок и мощный блочный редактор обзоров GameQuill с 6 дизайнами карточек игр и живой статистикой сообщества PANAX.**

</div>

---

## Что умеет расширение

- **Полная локализация интерфейса**: перевод навигации, профилей, фильтров, уведомлений, дат, модальных окон и плейсхолдеров редактора (`contenteditable` / `data-placeholder`).
- **Перевод постов и комментариев**: кнопка **Translate** прямо в карточках постов, рецензий и комментариев.
- **Обновлённые иконки оценок**: собственные стильные иконки для всех 6 реакций PANAX (до и после нажатия).
- **Редактор обзоров GameQuill**: блочный редактор с темами (`panax-dark` и др.), вставкой текста, заголовков, цитат, спойлеров, изображений/галерей, видео YouTube, виджетов Steam, Мастерской Steam и карточек игр.
- **Живые рейтинги PANAX**: автоматическая подгрузка обложек, студий, издателей, жанров и реальных процентов реакций с `panaxgames.com` как для игр из поиска PANAX, так и для игр, найденных через Steam.

---

## Иконки оценок PANAX

В расширении заменены стандартные иконки реакций для всех 6 уровней оценки:

| Реакция | До нажатия (`-off`) | После нажатия (`-on`) | Цвет в виджетах |
| :--- | :---: | :---: | :--- |
| **Легенда** | <img src="ratings/legendary-off.png" width="36" height="36" alt="Легенда off" /> | <img src="ratings/legendary-on.png" width="36" height="36" alt="Легенда on" /> | `#f3cb16` |
| **Круто** | <img src="ratings/awesome-off.png" width="36" height="36" alt="Круто off" /> | <img src="ratings/awesome-on.png" width="36" height="36" alt="Круто on" /> | `#f2a000` |
| **Хорошо** | <img src="ratings/good-off.png" width="36" height="36" alt="Хорошо off" /> | <img src="ratings/good-on.png" width="36" height="36" alt="Хорошо on" /> | `#bd55e9` |
| **Норм** | <img src="ratings/decent-off.png" width="36" height="36" alt="Норм off" /> | <img src="ratings/decent-on.png" width="36" height="36" alt="Норм on" /> | `#3c9df3` |
| **Плохо** | <img src="ratings/dislike-off.png" width="36" height="36" alt="Плохо off" /> | <img src="ratings/dislike-on.png" width="36" height="36" alt="Плохо on" /> | `#8ea6af` |
| **Ужас** | <img src="ratings/awful-off.png" width="36" height="36" alt="Ужас off" /> | <img src="ratings/awful-on.png" width="36" height="36" alt="Ужас on" /> | `#e34d68` |

---

## 6 дизайнов карточки игры в GameQuill

При вставке игры в обзор можно выбрать стиль карточки в выпадающем списке **«Дизайн карточки»**:

| Вариант | Название | Описание стиля |
| :--- | :--- | :--- |
| `classic` | **🃏 Классика** | Тёмная карточка с обложкой, тегами жанров, оценками и кнопками источников |
| `duet` | **🎭 Дуэт** | Светлая бумажная карточка `#f0eee8` с обложкой и двумя главными реакциями сообщества с PNG-бейджами через `+` |
| `editorial` | **📰 Вердикт** | Газетная вёрстка `#e9e5dc` с водяным знаком-кругами, крупным блоком лидера и 2-колоночной таблицей остальных реакций |
| `staircase` | **📊 Лестница** | Вертикальная диаграмма-лестница из 6 цветных столбцов с процентами над каждым уровнем |
| `type` | **🔤 Типографика** | Журнальный постер `#faf9f5` с крупным двухцветным заголовком в `Impact` и горизонтальными шкалами |
| `brutal` | **⬛ Брутализм** | Белый двухколоночный блок с жёсткой чёрной рамкой `4px`, постером, оранжевым лидером и моноширинной таблицей |

---

## Установка в Chrome / Edge / Brave

1. Скачайте репозиторий или распакуйте `panax-ru.zip`.
2. Откройте `chrome://extensions/` в браузере.
3. Включите **Режим разработчика** (Developer mode) в правом верхнем углу.
4. Нажмите **Загрузить распакованное расширение** (Load unpacked) и выберите папку `PanaxGamesRu`.
5. Откройте [panaxgames.com](https://panaxgames.com) и обновите страницу.

---

## Разработка и сборка

Проект использует `esbuild` для сборки исходников из `src/` в бандлы расширения:

```powershell
# Установка зависимостей
npm install

# Сборка content-main.js, content.js и gamequill/bridge.js
npm run build

# Режим наблюдения (watch)
npm run watch

# Упаковка готового архива panax-ru.zip
npm run pack
```

### Структура репозитория

- `manifest.json` — конфигурация Chrome-расширения (Manifest V3).
- `src/content/` — контент-скрипты перевода, обогащения и рендера виджетов (`render.js`, `render.css`).
- `src/gamequill/` — мост `window.GQ` (`bridge.js`, `bridge-core.js`) для поиска и загрузки данных PANAX / Steam.
- `src/shared/` — общая схема данных (`gq-schema.js`), демо-данные (`gq-demo.js`), санитайзер, темы и кодирование.
- `gamequill/` — редактор обзоров (`app.js`, `app.css`, `index.html`, собранный `bridge.js`).
- `ratings/` и `icons/` — графические ресурсы и иконки оценок.
- `designs/` — HTML-прототипы виджетов и исходные ассеты.
- `ai/` — документация и чек-лист для ИИ-ассистентов ([ai/README.md](ai/README.md)).
