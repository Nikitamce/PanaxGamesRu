const ver = document.getElementById('ver');
const input = document.getElementById('on');
const hint = document.getElementById('hint');

ver.textContent = `PANAX RU ${chrome.runtime.getManifest().version}`;

function paint(on) {
  input.checked = on;
  hint.textContent = on ? 'Включён на panaxgames.com' : 'Выключен. Сайт на английском';
}

chrome.storage.local.get({ panaxRuEnabled: true }, (data) => {
  paint(data.panaxRuEnabled !== false);
});

input.addEventListener('change', () => {
  const on = input.checked;
  paint(on);
  chrome.storage.local.set({ panaxRuEnabled: on }, () => {
    chrome.tabs.query(
      { url: ['https://panaxgames.com/*', 'https://www.panaxgames.com/*'] },
      (tabs) => {
        for (const tab of tabs) chrome.tabs.reload(tab.id);
      },
    );
  });
});
