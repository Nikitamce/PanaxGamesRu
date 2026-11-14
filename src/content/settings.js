import { convertCurrency } from "./api/fx.js";

var DEFAULT_SETTINGS = {
  panaxRuEnabled: true,
  showGameWidgets: true,
  showRatings: true,
  showSteamStore: true,
  showQuickLinks: true,
  showPlayerStats: true,
  showPriceConvert: true,
  steamCountry: "KZ",
  convertCurrency: "RUB",
  showTranslate: true,
  showGameQuill: true,
  gqTheme: "panax-dark"
};
var currentSettings = { ...DEFAULT_SETTINGS };
export function getSettings() {
  return currentSettings;
}
export function loadSettings() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
        currentSettings = { ...DEFAULT_SETTINGS, ...stored || {} };
        resolve(currentSettings);
      });
    } else {
      resolve(currentSettings);
    }
  });
}
