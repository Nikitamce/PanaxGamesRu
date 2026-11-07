<p align="center">
  <a href="./README.md"><img alt="Русский" src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-22262c?style=for-the-badge&labelColor=22262c&color=22262c"></a>
  &nbsp;
  <a href="./README.en.md"><img alt="English" src="https://img.shields.io/badge/English-0b0d10?style=for-the-badge&labelColor=84B6C7&color=84B6C7"></a>
</p>

<p align="center">
  <img src="docs/readme/banner.png" alt="Panax Russian interface" width="860">
</p>

<p align="center">
  <a href="https://panaxgames.com">panaxgames.com</a>
  &nbsp;·&nbsp;
  Chrome MV3
  &nbsp;·&nbsp;
  offline, no reload
</p>

A Chrome extension that turns the [PANAX](https://panaxgames.com) interface into Russian as soon as it is installed. The dictionary ships inside the extension. Posts, reviews, comments, and game titles stay in the author’s language.

## What it looks like

Feed tabs, post labels, dates, and filters.

<p align="center">
  <img src="docs/readme/feed.png" alt="Profile tabs, Off-topic label, date, and filter" width="860">
</p>

Sort menu, notifications, and short labels.

<p align="center">
  <img src="docs/readme/panels.png" alt="Sort menu, notification, and goal" width="860">
</p>

Rating icons with Russian ribbons. These are the same files the extension swaps in on the site.

<p align="center">
  <img src="docs/readme/ratings.png" alt="Legendary, Awesome, Good, Decent, Bad, Awful in Russian" width="860">
</p>

## What is translated

- header, sidebar, buttons, and profile tabs
- dates, counts, and notifications: the name stays, the action becomes Russian
- post labels, sort options, and platform filters
- the avatar editor and the Russian **Панакс** wordmark
- ratings: Легенда, Круто, Хорошо, Норм, Плохо, Ужас

Platform names stay as on the site: PC, PS4, Xbox One, and the rest.

## Install

```bash
npm install
npm run build
```

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → the `dist` folder.

Open [panaxgames.com](https://panaxgames.com). A `PANAX RU` badge in the bottom-right shows the build. After a dictionary change, run `npm run build` again, press Reload on the extension, then Ctrl+Shift+R on the site.

## Dictionary

| File | Role |
| --- | --- |
| `src/locales/ru.json` | English phrase → Russian text |
| `src/locales/en.json` | the same phrases in English |
| `ai/README.md` | how to change a string without breaking layout |
