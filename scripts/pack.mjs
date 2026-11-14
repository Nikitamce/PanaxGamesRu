import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outZip = path.join(ROOT, "panax-ru.zip");

const items = [
  "manifest.json",
  "background.js",
  "content.js",
  "content-main.js",
  "popup.html",
  "popup.js",
  "gamequill",
  "fonts",
  "icons",
  "logo",
  "ratings"
].filter((p) => fs.existsSync(path.join(ROOT, p)));

if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path ${items.map((i) => `'${i}'`).join(",")} -DestinationPath '${outZip}' -Force`
  ],
  { cwd: ROOT, stdio: "inherit" }
);

console.log(`Packed ${outZip}`);
