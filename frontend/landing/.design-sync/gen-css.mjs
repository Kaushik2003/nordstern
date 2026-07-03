// design-sync CSS generator (cfg.buildCmd = `node .design-sync/gen-css.mjs`).
//
// This app has no compiled component stylesheet — it's a Next app whose styles
// are Tailwind v4 utilities generated JIT from `app/globals.css` (`@theme` = the
// design tokens). This script compiles a complete, standalone stylesheet the DS
// bundle can ship as cfg.cssEntry:
//   1. take app/globals.css (source of truth for tokens + base),
//   2. disable Tailwind auto source-detection (git root is nordstern/, not here)
//      and add EXPLICIT @source dirs so every utility used by components,
//      app, and authored previews is emitted,
//   3. compile via postcss + @tailwindcss/postcss (both already installed),
//   4. wire brand webfonts: a remote @import for Inter / JetBrains Mono plus the
//      --font-inter / --font-jetbrains vars globals.css references via next/font
//      (undefined in a standalone sheet otherwise).
//
// Run from the landing root. Output: .design-sync/generated/ds.css
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = process.cwd();
const outDir = resolve(root, ".design-sync/generated");
mkdirSync(outDir, { recursive: true });
// @source dirs must exist; previews/ may not on the first run.
const previewsDir = resolve(root, ".design-sync/previews");
if (!existsSync(previewsDir)) mkdirSync(previewsDir, { recursive: true });

const sources = [
  resolve(root, "components"),
  resolve(root, "app"),
  previewsDir,
];

const globals = readFileSync(resolve(root, "app/globals.css"), "utf8");
// Turn `@import "tailwindcss";` into an explicit, detection-free import.
const sourceDirectives = sources.map((s) => `@source "${s}";`).join("\n");
const input = globals.replace(
  /@import\s+["']tailwindcss["']\s*;/,
  `@import "tailwindcss" source(none);\n${sourceDirectives}`,
);
if (!/@import "tailwindcss" source\(none\)/.test(input)) {
  console.error("gen-css: could not find `@import \"tailwindcss\";` in app/globals.css");
  process.exit(1);
}

const result = await postcss([tailwind()]).process(input, {
  from: resolve(root, "app/globals.css"),
  to: resolve(outDir, "ds.css"),
});

// Brand fonts. globals.css sets --font-sans: var(--font-inter) (bound to
// next/font at runtime in the real app). In a standalone sheet those vars are
// undefined, so define them and load the families remotely. `@import url()`
// must be the first statement in the file.
const fontImport =
  '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap");\n';
const fontVars =
  "\n/* design-sync: bind the next/font-provided vars to real families */\n" +
  ":root{--font-inter:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;" +
  "--font-jetbrains:'JetBrains Mono',ui-monospace,SFMono-Regular,'SF Mono',monospace;}\n";

writeFileSync(resolve(outDir, "ds.css"), fontImport + result.css + fontVars);
console.error(`gen-css: wrote .design-sync/generated/ds.css (${(Buffer.byteLength(fontImport + result.css + fontVars) / 1024).toFixed(0)} KB) from ${sources.length} @source dirs`);
