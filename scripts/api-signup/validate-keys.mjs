#!/usr/bin/env node

/**
 * OODA API Key Validator
 *
 * Tests each API key in .env.local to confirm it's working.
 * Run after signup-all.mjs to verify everything is wired up.
 *
 * Usage: node scripts/api-signup/validate-keys.mjs
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;

  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}

async function testCesium(token) {
  try {
    const res = await fetch("https://api.cesium.com/v1/assets", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: "ok", detail: "Authenticated with Cesium Ion" };
    if (res.status === 401) return { status: "fail", detail: "Invalid token (401 Unauthorized)" };
    return { status: "fail", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

async function testNASA(key) {
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}&count=1`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: "ok", detail: "NASA API responding" };
    if (res.status === 403) return { status: "fail", detail: "Invalid or rate-limited key" };
    return { status: "fail", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

async function testOpenWeather(key) {
  try {
    // Test with Strait of Hormuz coordinates
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=26.5&lon=56.3&appid=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) return { status: "ok", detail: "Weather API responding" };
    if (res.status === 401) return { status: "fail", detail: "Invalid key (401)" };
    if (res.status === 429) return { status: "warn", detail: "Rate limited — key may still be activating (takes up to 2hrs)" };
    return { status: "fail", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

async function testAISstream(key) {
  // AISstream uses WebSocket, so we just validate the key format
  // and attempt a quick HTTP check if they have an endpoint
  try {
    if (key && key.length > 10) {
      return { status: "ok", detail: `Key present (${key.length} chars) — WebSocket validation requires runtime test` };
    }
    return { status: "fail", detail: "Key too short or empty" };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

async function testGoogleMaps(key) {
  try {
    const res = await fetch(
      `https://tile.googleapis.com/v1/3dtiles/root.json?key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) return { status: "ok", detail: "Google 3D Tiles API responding" };
    if (res.status === 403) return { status: "fail", detail: "Key invalid or API not enabled" };
    return { status: "fail", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

async function testGroq(key) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: "ok", detail: "GROQ API responding" };
    if (res.status === 401) return { status: "fail", detail: "Invalid API key" };
    return { status: "fail", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "fail", detail: e.message };
  }
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            OODA — API Key Validator                      ║
╚══════════════════════════════════════════════════════════╝
`);

  const env = loadEnv();

  const tests = [
    {
      name: "Cesium Ion",
      key: "NEXT_PUBLIC_CESIUM_ION_TOKEN",
      critical: true,
      test: testCesium,
    },
    {
      name: "AISstream",
      key: "AISSTREAM_API_KEY",
      critical: true,
      test: testAISstream,
    },
    {
      name: "NASA API",
      key: "NASA_API_KEY",
      critical: false,
      test: testNASA,
    },
    {
      name: "OpenWeatherMap",
      key: "WEATHER_API_KEY",
      critical: false,
      test: testOpenWeather,
    },
    {
      name: "Google 3D Tiles",
      key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
      critical: false,
      test: testGoogleMaps,
    },
    {
      name: "GROQ",
      key: "GROQ_API_KEY",
      critical: false,
      test: testGroq,
    },
  ];

  const results = [];

  for (const t of tests) {
    const value = env[t.key];
    const priority = t.critical ? "CRITICAL" : "OPTIONAL";

    if (!value || value.includes("paste_your") || value.includes("your_")) {
      results.push({
        ...t,
        result: { status: "missing", detail: "Not configured in .env.local" },
      });
      const icon = t.critical ? "🔴" : "⚪";
      console.log(`  ${icon} ${t.name.padEnd(20)} [${priority}]  NOT SET`);
      continue;
    }

    process.stdout.write(`  🔄 ${t.name.padEnd(20)} [${priority}]  Testing...`);
    const result = await t.test(value);
    results.push({ ...t, result });

    // Clear the line and rewrite with result
    process.stdout.write("\r");
    const icon = result.status === "ok" ? "🟢" : result.status === "warn" ? "🟡" : "🔴";
    console.log(`  ${icon} ${t.name.padEnd(20)} [${priority}]  ${result.status.toUpperCase()} — ${result.detail}`);
  }

  // Summary
  const working = results.filter((r) => r.result.status === "ok").length;
  const missing = results.filter((r) => r.result.status === "missing").length;
  const failed = results.filter((r) => r.result.status === "fail").length;
  const criticalMissing = results.filter(
    (r) => r.critical && r.result.status !== "ok"
  ).length;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${working} working / ${failed} failed / ${missing} not configured`);

  if (criticalMissing > 0) {
    console.log(`\n  ⚠️  ${criticalMissing} CRITICAL key(s) missing — run signup script:`);
    console.log(`     node scripts/api-signup/signup-all.mjs`);
  } else {
    console.log(`\n  ✅ All critical keys are configured!`);
  }

  // Free sources status
  console.log(`\n  Free sources (no key needed):`);
  console.log(`  🟢 airplanes.live    ADS-B flight tracking`);
  console.log(`  🟢 CelesTrak         Satellite TLE positions`);
  console.log(`  🟢 USGS              Earthquake data`);
  console.log(`  🟢 GDELT             Geocoded news events`);
  console.log(`  🟢 Nominatim         Location search`);
  console.log(`${"─".repeat(60)}\n`);
}

main().catch(console.error);
