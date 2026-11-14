var THEMES = {
  "panax-dark": { id: "panax-dark", name: "PANAX Dark" },
  gamequill: { id: "gamequill", name: "GameQuill" }
};
export var DEFAULT_THEME = "panax-dark";
export function normalizeTheme(id) {
  const k = String(id || "").trim();
  return THEMES[k] ? k : DEFAULT_THEME;
}
export function themeList() {
  return Object.values(THEMES);
}
