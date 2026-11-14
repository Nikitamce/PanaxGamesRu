// Пересобирает бандлы из извлечённого дерева src/ (tools/bundles.json)
// и проверяет побайтовое совпадение с оригиналами (sha256).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "bundles.json"), "utf8"));

function escapeNonAscii(s) {
  return s
    .replace(/[\u007f-\u00ff]/g,
      (c) => "\\x" + c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase())
    .replace(/[\u0100-\uffff]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase());
}

// Печать строк как printer esbuild: по умолчанию "..."; если есть " и нет ' — '...';
// если есть " и перевод строки — и нет `/${ — шаблонная строка с реальными \n.
function quoteString(s) {
  const hasD = s.includes('"');
  if (hasD && /[\r\n]/.test(s) && !s.includes("`") && !s.includes("${")) {
    const body = s
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    return "`" + escapeNonAscii(body) + "`";
  }
  let out = escapeNonAscii(JSON.stringify(s));
  if (hasD && !s.includes("'")) {
    out = out.replace(/\\"/g, '"').replace(/'/g, "\\'");
  }
  return out;
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function esbuildJsonLiteral(value) {
  const keys = Object.keys(value);
  if (!keys.length) return "{}";
  const lines = keys.map((k, i) => {
    const key = IDENT_RE.test(k) ? k : quoteString(k);
    const v = value[k];
    const val = typeof v === "string" ? quoteString(v) : escapeNonAscii(JSON.stringify(v));
    return `  ${key}: ${val}${i + 1 < keys.length ? "," : ""}`;
  });
  return "{\n" + lines.join("\n") + "\n}";
}

function moduleCode({ src, kind, varName }) {
  const text = fs.readFileSync(path.join(ROOT, src), "utf8");
  if (kind === "js") return text.replace(/\r?\n$/, "");
  if (kind === "json") return `var ${varName} = ${esbuildJsonLiteral(JSON.parse(text))};`;
  if (kind === "css") {
    return `var ${varName} = ${quoteString(text)};`;
  }
  throw new Error(`Неизвестный вид модуля: ${kind}`);
}

let ok = true;
for (const bundle of manifest.bundles) {
  const parts = ["(() => {"];
  for (const mod of bundle.modules) {
    parts.push(`  // ${mod.src.replace(/^src-[^/]+\//, "")}`);
    const rawSet = new Set(mod.raw || []);
    const codeLines = moduleCode(mod).replace(/\r?\n$/, "").split("\n");
    parts.push(codeLines.map((l, i) => (l && !rawSet.has(i) ? "  " + l : l)).join("\n"));
    for (let i = 0; i < (mod.blank || 0); i++) parts.push("");
  }
  parts.push("})();", "");
  const rebuilt = parts.join("\n");
  const orig = fs.readFileSync(path.join(ROOT, bundle.file), "utf8");
  const h = (s) => crypto.createHash("sha256").update(s).digest("hex");
  const match = rebuilt === orig;
  ok = ok && match;
  console.log(`${match ? "OK  " : "FAIL"} ${bundle.file}  ${h(rebuilt).slice(0, 12)}`);
  if (!match) {
    fs.writeFileSync(path.join(ROOT, "dist-" + path.basename(bundle.file)), rebuilt);
    const rl = rebuilt.split("\n"), ol = orig.split("\n");
    for (let i = 0; i < Math.max(rl.length, ol.length); i++) {
      if (rl[i] !== ol[i]) {
        console.log(`  расхождение -> dist-${path.basename(bundle.file)}, строка ${i + 1}:`);
        console.log(`    нов : ${JSON.stringify((rl[i] || "").slice(0, 200))}`);
        console.log(`    ориг: ${JSON.stringify((ol[i] || "").slice(0, 200))}`);
        break;
      }
    }
  }
}
console.log(ok ? "Все бандлы восстановлены побайтово." : "Есть расхождения.");
process.exit(ok ? 0 : 1);
