#!/usr/bin/env node

/**
 * Tiny local web form for pasting API keys.
 * Opens in browser — paste keys, hit save, they go straight to .env.local.
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const PORT = 3999;
const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");

function readEnv() {
  if (fs.existsSync(ENV_FILE)) return fs.readFileSync(ENV_FILE, "utf-8");
  return "";
}

function writeEnvKey(key, value) {
  let content = readEnv();
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_FILE, content);
}

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>OODA — API Key Input</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000a00; color: #00ff41; font-family: 'SF Mono', 'Menlo', monospace; padding: 30px; }
    h1 { font-size: 18px; letter-spacing: 4px; margin-bottom: 8px; }
    .sub { color: #555; font-size: 11px; margin-bottom: 30px; }
    .key-group { margin-bottom: 20px; }
    label { display: block; font-size: 11px; letter-spacing: 2px; color: #888; margin-bottom: 6px; }
    .critical label { color: #ff6600; }
    input { width: 100%; background: #0a0a0a; border: 1px solid #1a3a1a; color: #00ff41; font-family: monospace;
            font-size: 14px; padding: 10px 12px; outline: none; }
    input:focus { border-color: #00ff41; }
    input::placeholder { color: #1a3a1a; }
    .status { font-size: 11px; margin-top: 4px; min-height: 16px; }
    .ok { color: #00ff41; }
    .err { color: #ff4444; }
    button { background: #00ff41; color: #000; border: none; font-family: monospace; font-size: 13px;
             letter-spacing: 2px; padding: 12px 30px; cursor: pointer; margin-top: 20px; font-weight: bold; }
    button:hover { background: #00cc33; }
    .done { background: #0a1a0a; border: 1px solid #00ff41; padding: 15px; margin-top: 20px; display: none; }
    .done.show { display: block; }
    .tag { display: inline-block; font-size: 9px; padding: 2px 6px; margin-left: 8px; border-radius: 2px; }
    .tag.crit { background: #441100; color: #ff6600; }
    .tag.opt { background: #1a1a00; color: #666; }
  </style>
</head>
<body>
  <h1>OODA API KEYS</h1>
  <p class="sub">Paste each key below. They save directly to .env.local</p>

  <div class="key-group critical">
    <label>CESIUM ION TOKEN <span class="tag crit">CRITICAL</span></label>
    <input id="cesium" placeholder="eyJhbGciOi..." data-key="NEXT_PUBLIC_CESIUM_ION_TOKEN" />
    <div class="status" id="cesium-status"></div>
  </div>

  <div class="key-group critical">
    <label>AISSTREAM API KEY <span class="tag crit">CRITICAL</span></label>
    <input id="ais" placeholder="Paste AISstream key..." data-key="AISSTREAM_API_KEY" />
    <div class="status" id="ais-status"></div>
  </div>

  <div class="key-group">
    <label>NASA API KEY <span class="tag opt">OPTIONAL</span></label>
    <input id="nasa" placeholder="Paste NASA key..." data-key="NASA_API_KEY" />
    <div class="status" id="nasa-status"></div>
  </div>

  <div class="key-group">
    <label>OPENWEATHERMAP API KEY <span class="tag opt">OPTIONAL</span></label>
    <input id="weather" placeholder="Paste OpenWeatherMap key..." data-key="WEATHER_API_KEY" />
    <div class="status" id="weather-status"></div>
  </div>

  <div class="key-group">
    <label>GOOGLE MAPS API KEY <span class="tag opt">OPTIONAL</span></label>
    <input id="google" placeholder="Paste Google Maps key..." data-key="NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" />
    <div class="status" id="google-status"></div>
  </div>

  <div class="key-group">
    <label>GROQ API KEY <span class="tag opt">OPTIONAL</span></label>
    <input id="groq" placeholder="Paste GROQ key..." data-key="GROQ_API_KEY" />
    <div class="status" id="groq-status"></div>
  </div>

  <button onclick="saveAll()">SAVE ALL KEYS</button>

  <div class="done" id="done">
    ✅ Keys saved to .env.local — restart dev server to activate.
  </div>

  <script>
    async function saveAll() {
      const inputs = document.querySelectorAll('input[data-key]');
      let saved = 0;
      for (const input of inputs) {
        const key = input.dataset.key;
        const value = input.value.trim();
        const statusEl = input.parentElement.querySelector('.status');
        if (!value) {
          statusEl.textContent = '— skipped';
          statusEl.className = 'status';
          continue;
        }
        try {
          const res = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
          });
          const data = await res.json();
          if (data.ok) {
            statusEl.textContent = '✅ Saved';
            statusEl.className = 'status ok';
            saved++;
          } else {
            statusEl.textContent = '❌ ' + (data.error || 'Failed');
            statusEl.className = 'status err';
          }
        } catch (e) {
          statusEl.textContent = '❌ ' + e.message;
          statusEl.className = 'status err';
        }
      }
      if (saved > 0) document.getElementById('done').classList.add('show');
    }
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
  } else if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { key, value } = JSON.parse(body);
        if (!key || !value) throw new Error("Missing key or value");
        // Whitelist allowed keys
        const allowed = [
          "NEXT_PUBLIC_CESIUM_ION_TOKEN", "AISSTREAM_API_KEY", "NASA_API_KEY",
          "WEATHER_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "GROQ_API_KEY",
        ];
        if (!allowed.includes(key)) throw new Error("Unknown key");
        writeEnvKey(key, value);
        console.log(`  ✅ Saved ${key} (${value.slice(0, 12)}...)`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  🔑 API Key input form running at: http://localhost:${PORT}\n`);
  // Auto-open in default browser
  try {
    execSync(`open http://localhost:${PORT}`);
  } catch {}
});
