#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cesiumSource = join(root, "node_modules/cesium/Build/Cesium");
const cesiumDest = join(root, "public/cesium");

const dirs = ["Workers", "ThirdParty", "Assets", "Widgets"];
// Also copy the main Cesium.js bundle (loaded via <script> tag in layout.tsx)
const mainFiles = ["Cesium.js"];

if (!existsSync(cesiumSource)) {
  console.log("⚠ Cesium source not found, skipping copy");
  process.exit(0);
}

mkdirSync(cesiumDest, { recursive: true });

for (const dir of dirs) {
  const src = join(cesiumSource, dir);
  const dest = join(cesiumDest, dir);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied cesium/${dir}`);
  }
}

for (const file of mainFiles) {
  const src = join(cesiumSource, file);
  const dest = join(cesiumDest, file);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`✓ Copied cesium/${file}`);
  }
}

console.log("✓ Cesium assets ready");

// ---------- No patching needed ----------
// Cesium.js is loaded via a classic <script> tag (non-module, bypasses Turbopack),
// so the WASM \0 escape sequences don't cause template-literal issues.
// The turbopack.resolveAlias in next.config.ts redirects bare "cesium" imports
// to src/lib/cesium-global.ts (a shim that re-exports window.Cesium).
