const ver = document.getElementById('ver');
const toggleEnabled = document.getElementById('toggle-enabled');
const toggleRatings = document.getElementById('toggle-ratings');
const toggleSteam = document.getElementById('toggle-steam');
const toggleLinks = document.getElementById('toggle-links');
const toggleConvert = document.getElementById('toggle-convert');
const togglePlayers = document.getElementById('toggle-players');
const btnReload = document.getElementById('btn-reload');
const mainHint = document.getElementById('main-hint');

try {
  ver.textContent = `v${chrome.runtime.getManifest().version}`;
} catch (_) {}

const DEFAULT_SETTINGS = {
  panaxRuEnabled: true,
  showRatings: true,
  showSteamStore: true,
  showQuickLinks: true,
  showPlayerStats: true,
  showPriceConvert: true,
};

function paint(s) {
  toggleEnabled.checked = s.panaxRuEnabled !== false;
  toggleRatings.checked = s.showRatings !== false;
  toggleSteam.checked = s.showSteamStore !== false;
  toggleLinks.checked = s.showQuickLinks !== false;
  toggleConvert.checked = s.showPriceConvert !== false;
  togglePlayers.checked = s.showPlayerStats !== false;

  mainHint.textContent = s.panaxRuEnabled !== false ? 'Русский язык интерфейса включён' : 'Выключен. Сайт на английском';
}

chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
  paint(data || DEFAULT_SETTINGS);
});

function save() {
  const settings = {
    panaxRuEnabled: toggleEnabled.checked,
    showRatings: toggleRatings.checked,
    showSteamStore: toggleSteam.checked,
    showQuickLinks: toggleLinks.checked,
    showPriceConvert: toggleConvert.checked,
    showPlayerStats: togglePlayers.checked,
  };

  paint(settings);
  chrome.storage.local.set(settings);
}

[toggleEnabled, toggleRatings, toggleSteam, toggleLinks, toggleConvert, togglePlayers].forEach((input) => {
  input.addEventListener('change', save);
});

btnReload.addEventListener('click', () => {
  btnReload.disabled = true;
  btnReload.textContent = 'Обновление...';
  chrome.tabs.query(
    { url: ['https://panaxgames.com/*', 'https://www.panaxgames.com/*'] },
    (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id);
      }
      setTimeout(() => {
        btnReload.disabled = false;
        btnReload.innerHTML = '<span>✓</span> Страницы обновлены';
        setTimeout(() => {
          btnReload.innerHTML = '<span>🔄</span> Перезагрузить страницы Panax';
        }, 1500);
      }, 500);
    }
  );
});
