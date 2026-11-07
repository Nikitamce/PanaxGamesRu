const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const ruPath = path.join(root, 'src/locales/ru.json');
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const add = {
  Hot: 'Горячее',
  Latest: 'Свежее',
  'Now playing': 'Сейчас играют',
  'Now Playing': 'Сейчас играют',
  'Most playing': 'Сейчас играют',
  'Most Playing': 'Сейчас играют',
  'Coming soon': 'Скоро',
  'Coming Soon': 'Скоро',
  'Hot in Community': 'Горячее в сообществе',
  Following: 'Подписки',
  News: 'Новости',
  All: 'Все',
  "You're all caught up": 'Вы всё просмотрели',
  'Visit the Latest tab for more.': 'Загляните во вкладку «Свежее».',
  'Follow games and gamers to build your own feed':
    'Подпишитесь на игры и игроков, чтобы собрать свою ленту',
  'No games followed yet': 'Пока нет подписок на игры',
  'Stay connected with the games you love.': 'Следите за любимыми играми.',
  'People You Follow': 'Люди, на которых вы подписаны',
  'Add to Wishlist': 'В желаемое',
  'View Details': 'Подробнее',
  'View More': 'Ещё',
  'Play Anywhere.': 'Играйте где угодно.',
  'Belong Here.': 'Будьте своими здесь.',
  'Explore Now': 'Смотреть',
  'EXPLORE NOW': 'СМОТРЕТЬ',
  'Join the Community': 'В сообщество',
  'Popular This Week': 'Популярное',
  'New Releases': 'Новинки',
  'Top Rated': 'Топ рейтинг',
  'Trending Games': 'В тренде',
  'Trending Games Now': 'В тренде',
  'See All': 'Все',
  Filters: 'Фильтры',
  Platform: 'Платформа',
  Genre: 'Жанр',
  'Search by title': 'Поиск по названию',
  'Advanced Filters': 'Расширенные фильтры',
  'Discover Games': 'Обзор игр',
  Discover: 'Обзор',
};

let n = 0;
for (const [k, v] of Object.entries(add)) {
  if (ru[k] !== v) {
    ru[k] = v;
    n += 1;
  }
}
fs.writeFileSync(ruPath, `${JSON.stringify(ru, null, 2)}\n`);
const en = {};
for (const k of Object.keys(ru)) en[k] = k;
fs.writeFileSync(path.join(root, 'src/locales/en.json'), `${JSON.stringify(en, null, 2)}\n`);
console.log('updated', n, 'total', Object.keys(ru).length);

for (const rel of ['package.json']) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/"version": "0\.2\.\d+"/, '"version": "0.2.3"');
  fs.writeFileSync(p, s);
}
{
  const p = path.join(root, 'scripts/build.mjs');
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/version: '0\.2\.\d+'/, "version: '0.2.3'");
  fs.writeFileSync(p, s);
}
