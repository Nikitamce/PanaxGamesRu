const ver = document.getElementById('ver');
const toggleEnabled = document.getElementById('toggle-enabled');
const toggleTranslate = document.getElementById('toggle-translate');
const toggleGameWidgets = document.getElementById('toggle-game-widgets');
const toggleRatings = document.getElementById('toggle-ratings');
const toggleSteam = document.getElementById('toggle-steam');
const toggleLinks = document.getElementById('toggle-links');
const toggleConvert = document.getElementById('toggle-convert');
const togglePlayers = document.getElementById('toggle-players');
const selectSteamCountry = document.getElementById('select-steam-country');
const selectConvertCurrency = document.getElementById('select-convert-currency');
const rowTargetCurrency = document.getElementById('row-target-currency');
const btnReload = document.getElementById('btn-reload');
const mainHint = document.getElementById('main-hint');

try {
  ver.textContent = `v${chrome.runtime.getManifest().version}`;
} catch (_) {}

const DEFAULT_SETTINGS = {
  panaxRuEnabled: true,
  showGameWidgets: true,
  showRatings: true,
  showSteamStore: true,
  showQuickLinks: true,
  showPlayerStats: true,
  showPriceConvert: true,
  steamCountry: 'KZ',
  convertCurrency: 'RUB',
  showTranslate: true,
};

function paint(s) {
  toggleEnabled.checked = s.panaxRuEnabled !== false;
  toggleTranslate.checked = s.showTranslate !== false;
  toggleGameWidgets.checked = s.showGameWidgets !== false;
  toggleRatings.checked = s.showRatings !== false;
  toggleSteam.checked = s.showSteamStore !== false;
  toggleLinks.checked = s.showQuickLinks !== false;
  toggleConvert.checked = s.showPriceConvert !== false;
  togglePlayers.checked = s.showPlayerStats !== false;

  if (s.steamCountry) {
    selectSteamCountry.value = s.steamCountry.toUpperCase();
  }
  if (s.convertCurrency) {
    selectConvertCurrency.value = s.convertCurrency.toUpperCase();
  }

  const widgetsOn = s.showGameWidgets !== false;
  const subRows = [toggleRatings, toggleSteam, toggleLinks, toggleConvert, togglePlayers];
  subRows.forEach(input => {
    input.disabled = !widgetsOn;
    const row = input.closest('.row');
    if (row) row.style.opacity = widgetsOn ? '1' : '0.4';
  });

  const convertRow = document.getElementById('row-target-currency');
  if (convertRow) {
    convertRow.style.opacity = (widgetsOn && toggleConvert.checked) ? '1' : '0.4';
  }
  selectConvertCurrency.disabled = !widgetsOn || !toggleConvert.checked;
  selectSteamCountry.disabled = !widgetsOn;
  const steamCountryRow = selectSteamCountry.closest('.row');
  if (steamCountryRow) {
    steamCountryRow.style.opacity = widgetsOn ? '1' : '0.4';
  }

  mainHint.textContent = s.panaxRuEnabled !== false ? 'Русский язык интерфейса включён' : 'Выключен. Сайт на английском';
}

chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
  paint(data || DEFAULT_SETTINGS);
});

function save() {
  const settings = {
    panaxRuEnabled: toggleEnabled.checked,
    showTranslate: toggleTranslate.checked,
    showGameWidgets: toggleGameWidgets.checked,
    showRatings: toggleRatings.checked,
    showSteamStore: toggleSteam.checked,
    showQuickLinks: toggleLinks.checked,
    showPriceConvert: toggleConvert.checked,
    showPlayerStats: togglePlayers.checked,
    steamCountry: selectSteamCountry.value,
    convertCurrency: selectConvertCurrency.value,
  };

  paint(settings);
  chrome.storage.local.set(settings);
}

[
  toggleEnabled,
  toggleTranslate,
  toggleGameWidgets,
  toggleRatings,
  toggleSteam,
  toggleLinks,
  toggleConvert,
  togglePlayers,
].forEach((input) => {
  input.addEventListener('change', save);
});

[selectSteamCountry, selectConvertCurrency].forEach((sel) => {
  sel.addEventListener('change', save);
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
