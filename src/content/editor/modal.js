/**
 * Modal dialog for searching and inserting rich widgets (Game Card, Steam, YouTube, Pros/Cons, Game Chip)
 */
import { buildGameWidgetHtml, buildSteamWidgetHtml, buildYouTubeWidgetHtml, buildProsConsWidgetHtml, buildGameChipHtml } from './serializer.js';
import { resolveSteam } from '../api/steam.js';
import { fetchBackloggdRating } from '../api/backloggd.js';

let modalEl = null;
let currentInsertCallback = null;

function createModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'panax-modal-overlay';
  modalEl.innerHTML = `
    <div class="panax-modal-box">
      <div class="panax-modal-head">
        <div class="panax-modal-title">Вставка виджета GameQuill</div>
        <button class="panax-modal-close" data-close="true">✕</button>
      </div>
      <div class="panax-modal-tabs">
        <button class="panax-modal-tab on" data-tab="game">🎮 Игра</button>
        <button class="panax-modal-tab" data-tab="steam">♨️ Steam</button>
        <button class="panax-modal-tab" data-tab="youtube">▶️ YouTube</button>
        <button class="panax-modal-tab" data-tab="proscons">⚖️ Плюсы / Минусы</button>
        <button class="panax-modal-tab" data-tab="chip">🕹️ Чип-ссылка</button>
      </div>
      <div class="panax-modal-body" id="panaxModalBody"></div>
    </div>
  `;

  document.body.appendChild(modalEl);

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl || e.target.closest('[data-close]')) {
      closeInsertModal();
    }
  });

  const tabs = modalEl.querySelectorAll('.panax-modal-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      renderTabBody(tab.dataset.tab);
    });
  });

  return modalEl;
}

function renderTabBody(tab) {
  const body = document.getElementById('panaxModalBody');
  if (!body) return;

  if (tab === 'game') {
    body.innerHTML = `
      <div class="panax-input-group">
        <label>Название игры</label>
        <input class="panax-inp" id="pInpGameTitle" placeholder="The Last of Us, Cyberpunk 2077...">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="panax-input-group">
          <label>Год выхода</label>
          <input class="panax-inp" id="pInpGameYear" placeholder="2023">
        </div>
        <div class="panax-input-group">
          <label>Оценка (из 10)</label>
          <input class="panax-inp" id="pInpGameScore" type="number" min="1" max="10" placeholder="9">
        </div>
      </div>
      <div class="panax-input-group">
        <label>Разработчик / Студия</label>
        <input class="panax-inp" id="pInpGameDev" placeholder="Naughty Dog, CD PROJEKT RED...">
      </div>
      <div class="panax-input-group">
        <label>Жанры (через запятую)</label>
        <input class="panax-inp" id="pInpGameGenres" placeholder="Экшен, Приключения, RPG">
      </div>
      <div class="panax-input-group">
        <label>URL обложки (по желанию)</label>
        <input class="panax-inp" id="pInpGameCover" placeholder="https://...">
      </div>
      <button class="panax-btn-submit" id="pSubmitGame">Вставить карточку игры</button>
    `;

    document.getElementById('pSubmitGame').onclick = () => {
      const title = document.getElementById('pInpGameTitle').value.trim();
      if (!title) return;
      const year = document.getElementById('pInpGameYear').value.trim();
      const score = document.getElementById('pInpGameScore').value.trim();
      const dev = document.getElementById('pInpGameDev').value.trim();
      const genres = document.getElementById('pInpGameGenres').value.split(',').map(s => s.trim()).filter(Boolean);
      const cover = document.getElementById('pInpGameCover').value.trim();

      const html = buildGameWidgetHtml({ title, year, score, dev, genres, cover });
      if (currentInsertCallback) currentInsertCallback(html);
      closeInsertModal();
    };
    return;
  }

  if (tab === 'steam') {
    body.innerHTML = `
      <div class="panax-input-group">
        <label>Название игры или ссылка в Steam</label>
        <input class="panax-inp" id="pInpSteamTitle" placeholder="Dota 2 или https://store.steampowered.com/app/...">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="panax-input-group">
          <label>Цена</label>
          <input class="panax-inp" id="pInpSteamPrice" placeholder="1 999 ₽ / Бесплатно">
        </div>
        <div class="panax-input-group">
          <label>Скидка (например, -20%)</label>
          <input class="panax-inp" id="pInpSteamDisc" placeholder="-20%">
        </div>
      </div>
      <div class="panax-input-group">
        <label>Ссылка на игру в Steam</label>
        <input class="panax-inp" id="pInpSteamUrl" placeholder="https://store.steampowered.com/app/...">
      </div>
      <button class="panax-btn-submit" id="pSubmitSteam">Вставить виджет Steam</button>
    `;

    // Auto-fetch if user types title
    const titleInput = document.getElementById('pInpSteamTitle');
    titleInput.addEventListener('change', async () => {
      const val = titleInput.value.trim();
      if (!val || val.startsWith('http')) return;
      try {
        const steam = await resolveSteam(val);
        if (steam) {
          if (steam.url) document.getElementById('pInpSteamUrl').value = steam.url;
          if (steam.price) document.getElementById('pInpSteamPrice').value = steam.price;
        }
      } catch (e) {
        /* ignore */
      }
    });

    document.getElementById('pSubmitSteam').onclick = () => {
      const title = document.getElementById('pInpSteamTitle').value.trim();
      if (!title) return;
      const price = document.getElementById('pInpSteamPrice').value.trim();
      const disc = document.getElementById('pInpSteamDisc').value.trim();
      const url = document.getElementById('pInpSteamUrl').value.trim() || 'https://store.steampowered.com';

      const html = buildSteamWidgetHtml({ title, price, disc, url });
      if (currentInsertCallback) currentInsertCallback(html);
      closeInsertModal();
    };
    return;
  }

  if (tab === 'youtube') {
    body.innerHTML = `
      <div class="panax-input-group">
        <label>Ссылка на YouTube ролик</label>
        <input class="panax-inp" id="pInpYtUrl" placeholder="https://www.youtube.com/watch?v=...">
      </div>
      <div class="panax-input-group">
        <label>Название видео / трейлера</label>
        <input class="panax-inp" id="pInpYtTitle" placeholder="Официальный релизный трейлер">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="panax-input-group">
          <label>Канал</label>
          <input class="panax-inp" id="pInpYtChannel" placeholder="PlayStation, IGN...">
        </div>
        <div class="panax-input-group">
          <label>Хронометраж</label>
          <input class="panax-inp" id="pInpYtDur" placeholder="2:45">
        </div>
      </div>
      <button class="panax-btn-submit" id="pSubmitYt">Вставить видеокарточку</button>
    `;

    document.getElementById('pSubmitYt').onclick = () => {
      const url = document.getElementById('pInpYtUrl').value.trim();
      if (!url) return;
      let vid = '';
      try {
        const u = new URL(url);
        vid = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
      } catch (e) {}
      const cover = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : '';
      const title = document.getElementById('pInpYtTitle').value.trim() || 'YouTube Видео';
      const channel = document.getElementById('pInpYtChannel').value.trim() || 'YouTube';
      const dur = document.getElementById('pInpYtDur').value.trim();

      const html = buildYouTubeWidgetHtml({ url, title, channel, dur, cover });
      if (currentInsertCallback) currentInsertCallback(html);
      closeInsertModal();
    };
    return;
  }

  if (tab === 'proscons') {
    body.innerHTML = `
      <div class="panax-input-group">
        <label>Плюсы (каждый с новой строки)</label>
        <textarea class="panax-inp" id="pInpPros" rows="3" placeholder="Великолепный визуал&#10;Увлекательный сюжет&#10;Шикарный саундтрек"></textarea>
      </div>
      <div class="panax-input-group">
        <label>Минусы (каждый с новой строки)</label>
        <textarea class="panax-inp" id="pInpCons" rows="3" placeholder="Просадки FPS&#10;Однообразные побочки"></textarea>
      </div>
      <button class="panax-btn-submit" id="pSubmitPC">Вставить блок «Плюсы и Минусы»</button>
    `;

    document.getElementById('pSubmitPC').onclick = () => {
      const pros = document.getElementById('pInpPros').value.split('\n').map(s => s.trim()).filter(Boolean);
      const cons = document.getElementById('pInpCons').value.split('\n').map(s => s.trim()).filter(Boolean);

      const html = buildProsConsWidgetHtml(pros, cons);
      if (currentInsertCallback) currentInsertCallback(html);
      closeInsertModal();
    };
    return;
  }

  if (tab === 'chip') {
    body.innerHTML = `
      <div class="panax-input-group">
        <label>Название игры</label>
        <input class="panax-inp" id="pInpChipTitle" placeholder="The Witcher 3, Cyberpunk...">
      </div>
      <div class="panax-input-group">
        <label>Ссылка (по умолчанию поиск в Panax)</label>
        <input class="panax-inp" id="pInpChipUrl" placeholder="https://panaxgames.com/games/...">
      </div>
      <button class="panax-btn-submit" id="pSubmitChip">Вставить чип в текст</button>
    `;

    document.getElementById('pSubmitChip').onclick = () => {
      const title = document.getElementById('pInpChipTitle').value.trim();
      if (!title) return;
      const url = document.getElementById('pInpChipUrl').value.trim() || `https://panaxgames.com/search?q=${encodeURIComponent(title)}`;
      const html = buildGameChipHtml(title, url);
      if (currentInsertCallback) currentInsertCallback(html);
      closeInsertModal();
    };
  }
}

export function openInsertModal(initialTab = 'game', callback = null) {
  currentInsertCallback = callback;
  const m = createModal();
  const tabs = m.querySelectorAll('.panax-modal-tab');
  tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === initialTab));
  renderTabBody(initialTab);
  m.classList.add('on');
}

export function closeInsertModal() {
  if (modalEl) modalEl.classList.remove('on');
  currentInsertCallback = null;
}
