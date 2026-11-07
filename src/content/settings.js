export const DEFAULT_SETTINGS = {
  panaxRuEnabled: true,
  showRatings: true,
  showSteamStore: true,
  showQuickLinks: true,
  showPlayerStats: true,
  showPriceConvert: true,
};

let currentSettings = { ...DEFAULT_SETTINGS };

export function getSettings() {
  return currentSettings;
}

export function loadSettings() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
        currentSettings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
        resolve(currentSettings);
      });
    } else {
      resolve(currentSettings);
    }
  });
}

export function updateSettings(partial) {
  currentSettings = { ...currentSettings, ...partial };
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set(currentSettings);
  }
}
