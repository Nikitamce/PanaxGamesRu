// Извлекает модули из собранных esbuild-бандлов обратно в дерево src/,
// опираясь на маркеры "// src/<путь>". Результат сохраняется в src/.
// Метаданные для побайтовой пересборки — в tools/bundles.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLES = ["content.js", "content-main.js", "gamequill/bridge.js"];

const evalLiteral = (code) => (0, eval)(`(${code})`);

function esbuildStringify(value) {
  // Как esbuild печатает JSON/text-модули в бандле: JSON + не-ASCII как \uXXXX.
  let s = JSON.stringify(value);
  s = s.replace(/[\u007f-\uffff]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  return s;
}

function esbuildJsonLiteral(value) {
  // esbuild печатает ключи-идентификаторы без кавычек.
  return esbuildStringify(value).replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, "$1:");
}

function parseBundle(file) {
  const abs = path.join(ROOT, file);
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const markers = [];
  lines.forEach((line, i) => {
    const m = /^  \/\/ (src\/\S+)$/.exec(line);
    if (m) markers.push({ path: m[1], line: i });
  });
  if (!markers.length) throw new Error(`Маркеры не найдены: ${file}`);

  const header = lines.slice(0, markers[0].line); // "(() => {"
  const footerIdx = lines.map((l, i) => [l, i]).filter(([l]) => l.trim() !== "").pop()[1];
  const footer = lines[footerIdx];                  // "})();"
  if (header[header.length - 1] !== "(() => {" || footer !== "})();") {
    throw new Error(`Неожиданный каркас бандла: ${file}`);
  }

  const modules = markers.map((mk, idx) => {
    const start = mk.line + 1;
    const end = idx + 1 < markers.length ? markers[idx + 1].line : footerIdx;
    const origLines = lines.slice(start, end);
    const rawLines = origLines.map((l) => (l.startsWith("  ") ? l.slice(2) : l));
    let blank = 0;
    while (blank < rawLines.length && rawLines[rawLines.length - 1 - blank].trim() === "") blank++;
    const bodyLines = rawLines.slice(0, rawLines.length - blank);
    // Строки, не начинающиеся с двух пробелов, — сырой контент (тело шаблонных строк):
    // esbuild их не индентирует, и при сборке индентировать нельзя.
    const raw = origLines
      .slice(0, rawLines.length - blank)
      .map((l, i) => [l, i])
      .filter(([l]) => l !== "" && !l.startsWith("  "))
      .map(([, i]) => i);
    const code = bodyLines.join("\n");
    return { path: mk.path, code, blank, raw };
  });
  return { file, header, footer, modules };
}

const manifest = { bundles: [] };
const written = new Map(); // srcPath -> { kind, data } для детекта конфликтов

for (const file of BUNDLES) {
  const b = parseBundle(file);
  const entry = { file, modules: [] };
  for (const mod of b.modules) {
    const ext = path.extname(mod.path);
    let kind = "js", data = mod.code, varName = null;

    if (ext === ".json") {
      const m = /^var (\w+) = ([\s\S]*?);\s*$/.exec(mod.code);
      if (!m) throw new Error(`Не разобрать JSON-модуль ${mod.path} в ${file}`);
      varName = m[1];
      kind = "json";
      data = JSON.stringify(evalLiteral(m[2]), null, 2) + "\n";
    } else if (ext === ".css") {
      const m = /^var (\w+) = ("[\s\S]*"|'[\s\S]*'|`[\s\S]*`);\s*$/.exec(mod.code);
      if (!m) throw new Error(`Не разобрать CSS-модуль ${mod.path} в ${file}`);
      varName = m[1];
      kind = "css";
      data = evalLiteral(m[2]);
    }

    let rel = mod.path;
    const prev = written.get(rel);
    if (prev && prev.raw !== mod.code) {
      // Тот же путь, но другой код — кладём в подпапку бандла.
      const dir = path.basename(file, path.extname(file));
      rel = `src-${dir}/${mod.path}`;
      console.log(`КОНФЛИКТ: ${mod.path} отличается в ${file} -> ${rel}`);
    } else if (prev) {
      console.log(`Пропуск (дубликат): ${mod.path} из ${file}`);
    }

    if (!written.has(rel)) {
      written.set(rel, { raw: mod.code, kind, varName });
      const abs = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, kind === "css" ? data : data.endsWith("\n") ? data : data + "\n");
    }
    entry.modules.push({ src: rel, kind, varName, blank: mod.blank, raw: mod.raw });
  }
  manifest.bundles.push(entry);
}

fs.mkdirSync(path.join(ROOT, "tools"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tools", "bundles.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Готово. Модулей: ${[...written.keys()].length}. Манифест: tools/bundles.json`);
