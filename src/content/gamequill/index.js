function isIsolatedWorld() {
  try {
    return typeof chrome !== "undefined" && !!(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}
async function startGameQuill() {
  if (false) {
    setAllowedImageOrigins(["http://localhost:8765", "http://127.0.0.1:8765"]);
  }
  if (!isIsolatedWorld()) {
    startGameQuillMain();
    return;
  }
  const s = await loadSettings();
  startComposer();
  startViewer({ enabled: s.showGameQuill !== false });
  try {
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "local" && ch.showGameQuill) setViewerEnabled(ch.showGameQuill.newValue !== false);
    });
  } catch {
  }
}
