import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  logLevel: "info"
};

const targets = [
  {
    ...common,
    entryPoints: [path.join(ROOT, "src/content/main.js")],
    outfile: path.join(ROOT, "content.js"),
    loader: { ".css": "text" }
  },
  {
    ...common,
    entryPoints: [path.join(ROOT, "src/content/main-world.js")],
    outfile: path.join(ROOT, "content-main.js")
  },
  {
    ...common,
    entryPoints: [path.join(ROOT, "src/gamequill/bridge.js")],
    outfile: path.join(ROOT, "gamequill/bridge.js")
  }
];

if (watch) {
  const contexts = await Promise.all(targets.map((t) => esbuild.context(t)));
  await Promise.all(contexts.map((c) => c.watch()));
  console.log("Watching for changes...");
} else {
  await Promise.all(targets.map((t) => esbuild.build(t)));
}
