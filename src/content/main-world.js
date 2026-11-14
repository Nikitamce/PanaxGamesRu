import { startGameQuillMain } from "./gamequill/main-bridge.js";

try {
  startGameQuillMain();
} catch (e) {
  console.warn("[PANAX RU] GameQuill main bridge", e);
}
