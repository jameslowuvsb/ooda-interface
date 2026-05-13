#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cesiumSource = join(root, "node_modules/cesium/Build/Cesium");
const cesiumDest = join(root, "public/cesium");

const dirs = ["Workers", "ThirdParty", "Assets", "Widgets"];

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

console.log("✓ Cesium assets ready");
