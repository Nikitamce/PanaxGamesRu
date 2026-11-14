import { loadSettings } from "../settings.js";
import { startGameQuillMain } from "./main-bridge.js";
import { setViewerEnabled, startViewer } from "./viewer.js";
import { startComposer } from "./composer.js";

function isIsolatedWorld() {
  try {
    return typeof chrome !== "undefined" && !!(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}
export async function startGameQuill() {
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
