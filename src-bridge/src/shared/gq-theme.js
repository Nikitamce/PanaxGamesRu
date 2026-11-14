var THEMES = {
  "panax-dark": { id: "panax-dark", name: "PANAX Dark" },
  gamequill: { id: "gamequill", name: "GameQuill" }
};
var DEFAULT_THEME = "panax-dark";
function normalizeTheme(id) {
  const k = String(id || "").trim();
  return THEMES[k] ? k : DEFAULT_THEME;
}
function themeList() {
  return Object.values(THEMES);
}
