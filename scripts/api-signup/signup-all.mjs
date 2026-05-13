#!/usr/bin/env node

/**
 * OODA API Key Auto-Signup & Extraction
 *
 * Decrypts your saved config (from `npm run config`), opens a visible
 * browser for each service, auto-fills forms with your details +
 * Apple-style passwords, marks everything as personal/testing use,
 * then extracts API keys and writes them to .env.local.
 *
 * Usage:
 *   node scripts/api-signup/signup-all.mjs
 *   node scripts/api-signup/signup-all.mjs --service nasa
 *   node scripts/api-signup/signup-all.mjs --service cesium
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as crypto from "crypto";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");
const VAULT_FILE = path.join(PROJECT_ROOT, ".api-vault.enc");

const PURPOSE = "Personal project / testing only (non-commercial)";

// ── Vault decryption ────────────────────────────────────

function decryptVault(passphrase) {
  const raw = JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
  const salt = Buffer.from(raw.salt, "hex");
  const iv = Buffer.from(raw.iv, "hex");
  const authTag = Buffer.from(raw.authTag, "hex");
  const key = crypto.scryptSync(passphrase, salt, 32);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(raw.data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// Populated from vault
let USER = {
  firstName: "",
  lastName: "",
  email: "",
  passwords: {},
};

// ── Helpers ─────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readEnvFile() {
  if (fs.existsSync(ENV_FILE)) {
    return fs.readFileSync(ENV_FILE, "utf-8");
  }
  return "";
}

function writeEnvKey(key, value) {
  let content = readEnvFile();
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_FILE, content);
  console.log(`  ✅ Written ${key} to .env.local`);
}

function logStep(msg) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${"─".repeat(60)}`);
}

function logInfo(msg) {
  console.log(`  ℹ️  ${msg}`);
}

function logSuccess(msg) {
  console.log(`  ✅ ${msg}`);
}

function logWait(msg) {
  console.log(`  ⏳ ${msg}`);
}

/** Try to fill a field if visible. Returns true if filled. */
async function tryFill(page, selector, value, label) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await el.fill(value);
    logInfo(`Filled ${label}`);
    return true;
  }
  return false;
}

/** Try to select a dropdown option containing text */
async function trySelectByText(page, selector, text, label) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Try selecting by visible text match
    const options = await el.locator("option").all();
    for (const opt of options) {
      const optText = await opt.textContent();
      if (optText && optText.toLowerCase().includes(text.toLowerCase())) {
        const val = await opt.getAttribute("value");
        if (val) {
          await el.selectOption(val);
          logInfo(`Selected ${label}: "${optText.trim()}"`);
          return true;
        }
      }
    }
    // Fallback: try direct text selection
    try {
      await el.selectOption({ label: text });
      logInfo(`Selected ${label}`);
      return true;
    } catch {}
  }
  return false;
}

/** Try to check a checkbox */
async function tryCheck(page, selector, label) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (!(await el.isChecked())) {
      await el.check();
      logInfo(`Checked ${label}`);
    }
    return true;
  }
  return false;
}

// ── Service: NASA API ───────────────────────────────────
async function signupNASA(browser) {
  logStep("1/4 — NASA API (instant key — no email verification needed)");

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://api.nasa.gov/", { waitUntil: "domcontentloaded" });
    logInfo("Opened api.nasa.gov");

    // Scroll to signup form
    await page.evaluate(() => {
      const el = document.getElementById("signUp") || document.getElementById("signup");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
    await page.waitForTimeout(2000);

    // Fill form fields
    await tryFill(page, 'input[name="firstName"], #firstName, input[placeholder*="First"]', USER.firstName, "first name");
    await tryFill(page, 'input[name="lastName"], #lastName, input[placeholder*="Last"]', USER.lastName, "last name");
    await tryFill(page, 'input[name="email"], #email, input[type="email"]', USER.email, "email");

    // Fill "How will you use the APIs?" — mark as personal/testing
    await tryFill(
      page,
      'textarea, input[name="reason"], input[name="howWillYouUseTheAPIs"]',
      PURPOSE,
      "purpose (personal/testing)"
    );

    logWait("Complete any CAPTCHA if shown, then click 'Signup'");
    logWait("Key appears IMMEDIATELY on page — no email verification needed");

    const nasaKey = await prompt("\n  📋 Paste your NASA API key (shown on the page): ");

    if (nasaKey && nasaKey.length > 5) {
      writeEnvKey("NASA_API_KEY", nasaKey);
      logSuccess(`NASA API key saved (${nasaKey.slice(0, 8)}...)`);
    } else {
      logInfo("Skipped NASA — no key provided");
    }
  } catch (e) {
    console.error("  ❌ NASA signup error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Service: Cesium Ion ─────────────────────────────────
async function signupCesium(browser) {
  logStep("2/4 — Cesium Ion (3D globe rendering — CRITICAL)");

  const context = await browser.newContext();
  const page = await context.newPage();
  const password = USER.passwords.cesium || "Fallback-Pass-1234!";

  try {
    await page.goto("https://ion.cesium.com/signup", { waitUntil: "domcontentloaded" });
    logInfo("Opened Cesium Ion signup");
    await page.waitForTimeout(2000);

    // Fill registration fields
    await tryFill(page, 'input[type="email"], input[name="email"], #email', USER.email, "email");
    await tryFill(page, 'input[name="name"], input[placeholder*="name" i], input[name="displayName"]', `${USER.firstName} ${USER.lastName}`, "name");
    await tryFill(page, 'input[type="password"]', password, "password");

    // If there's a "company" or "organization" field
    await tryFill(page, 'input[name="company"], input[name="organization"], input[placeholder*="company" i], input[placeholder*="organization" i]', "Personal", "company (Personal)");

    // If there's a use-case/purpose field or dropdown
    await tryFill(page, 'textarea[name="useCase"], textarea[name="purpose"], input[name="useCase"]', PURPOSE, "use case (personal/testing)");
    await trySelectByText(page, 'select[name="useCase"], select[name="purpose"], select[name="industry"]', "personal", "use case");
    await trySelectByText(page, 'select[name="useCase"], select[name="purpose"], select[name="industry"]', "education", "use case");

    // Accept terms if checkbox exists
    await tryCheck(page, 'input[type="checkbox"][name*="terms"], input[type="checkbox"][name*="agree"], input[type="checkbox"][name*="tos"]', "terms");

    logWait("Complete signup in the browser (CAPTCHA, terms, etc.)");
    logWait("Check email → click verification link");
    logWait("Then go to: Access Tokens (left sidebar)");
    logWait("Copy the 'default' token (starts with eyJhbGci...)");

    const token = await prompt("\n  📋 Paste your Cesium Ion access token: ");

    if (token && token.length > 20) {
      writeEnvKey("NEXT_PUBLIC_CESIUM_ION_TOKEN", token);
      logSuccess(`Cesium Ion token saved (${token.slice(0, 20)}...)`);
    } else {
      logInfo("Skipped Cesium — no token provided");
    }
  } catch (e) {
    console.error("  ❌ Cesium signup error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Service: AISstream ──────────────────────────────────
async function signupAISstream(browser) {
  logStep("3/4 — AISstream (live vessel tracking — CRITICAL)");

  const context = await browser.newContext();
  const page = await context.newPage();
  const password = USER.passwords.aisstream || "Fallback-Pass-5678!";

  try {
    await page.goto("https://aisstream.io/authenticate", { waitUntil: "domcontentloaded" });
    logInfo("Opened AISstream");
    await page.waitForTimeout(2000);

    // Fill registration fields
    await tryFill(page, 'input[type="email"], input[name="email"], #email', USER.email, "email");
    await tryFill(page, 'input[type="password"]', password, "password");

    // Name fields if present
    await tryFill(page, 'input[name="name"], input[name="firstName"], input[placeholder*="name" i]', `${USER.firstName} ${USER.lastName}`, "name");

    // Purpose / use-case
    await tryFill(page, 'textarea, input[name="purpose"], input[name="useCase"]', PURPOSE, "purpose (personal/testing)");
    await trySelectByText(page, 'select[name="purpose"], select[name="useCase"], select[name="plan"]', "personal", "use type");
    await trySelectByText(page, 'select[name="purpose"], select[name="useCase"], select[name="plan"]', "free", "plan");

    // Terms checkbox
    await tryCheck(page, 'input[type="checkbox"]', "terms/agreement");

    logWait("Complete signup/login in the browser");
    logWait("Navigate to Dashboard → API Keys");
    logWait("Copy your API key");

    const aisKey = await prompt("\n  📋 Paste your AISstream API key: ");

    if (aisKey && aisKey.length > 5) {
      writeEnvKey("AISSTREAM_API_KEY", aisKey);
      logSuccess(`AISstream key saved (${aisKey.slice(0, 12)}...)`);
    } else {
      logInfo("Skipped AISstream — no key provided");
    }
  } catch (e) {
    console.error("  ❌ AISstream signup error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Service: OpenWeatherMap ─────────────────────────────
async function signupOpenWeather(browser) {
  logStep("4/4 — OpenWeatherMap (weather radar — optional)");

  const context = await browser.newContext();
  const page = await context.newPage();
  const password = USER.passwords.openweather || "Fallback-Pass-9012!";

  try {
    await page.goto("https://home.openweathermap.org/users/sign_up", { waitUntil: "domcontentloaded" });
    logInfo("Opened OpenWeatherMap signup");
    await page.waitForTimeout(2000);

    // Username
    const username = `${USER.firstName.toLowerCase()}${USER.lastName.toLowerCase()}_ooda`;
    await tryFill(page, 'input[name="user[username]"], #user_username, input[placeholder*="Username" i]', username, "username");

    // Email
    await tryFill(page, 'input[name="user[email]"], #user_email, input[type="email"]', USER.email, "email");

    // Password fields
    const passFields = page.locator('input[type="password"]');
    const passCount = await passFields.count();
    if (passCount >= 1) {
      await passFields.nth(0).fill(password);
      logInfo("Filled password");
    }
    if (passCount >= 2) {
      await passFields.nth(1).fill(password);
      logInfo("Filled password confirmation");
    }

    // Purpose dropdown — select "Education / Science" or "Personal"
    await trySelectByText(page, 'select[name="user[purpose]"], select[name="purpose"], select', "education", "purpose");
    await trySelectByText(page, 'select[name="user[purpose]"], select[name="purpose"], select', "personal", "purpose");

    // "Company" field — mark personal
    await tryFill(page, 'input[name="user[company]"], input[name="company"], input[placeholder*="company" i]', "Personal / Testing", "company");

    // Terms checkboxes
    await tryCheck(page, 'input[type="checkbox"][name*="agree"], input[name="agreement"]', "terms");
    await tryCheck(page, 'input[type="checkbox"][name*="mailing"]', "mailing list");

    // Non-commercial / personal radio if exists
    const personalRadio = page.locator('input[type="radio"][value*="personal"], input[type="radio"][value*="education"]').first();
    if (await personalRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await personalRadio.check();
      logInfo("Selected personal/education use");
    }

    logWait("Complete signup (remaining checkboxes, CAPTCHA, submit)");
    logWait("Check email → click verification link");
    logWait("Go to: Account → API Keys tab");
    logWait("Copy your default API key");
    logWait("NOTE: New OpenWeatherMap keys take up to 2 hours to activate!");

    const key = await prompt("\n  📋 Paste your OpenWeatherMap API key: ");

    if (key && key.length > 10) {
      writeEnvKey("WEATHER_API_KEY", key);
      logSuccess(`OpenWeatherMap key saved (${key.slice(0, 10)}...)`);
    } else {
      logInfo("Skipped OpenWeatherMap — no key provided");
    }
  } catch (e) {
    console.error("  ❌ OpenWeatherMap signup error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Extended: Google 3D Tiles ───────────────────────────
async function signupGoogle3DTiles(browser) {
  logStep("EXTRA — Google Maps 3D Tiles (photorealistic buildings)");

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://console.cloud.google.com/google/maps-apis/credentials", { waitUntil: "domcontentloaded" });
    logInfo("Opened Google Cloud Console");
    logWait("1. Create/select a project");
    logWait("2. Enable 'Map Tiles API' in APIs & Services → Library");
    logWait("3. Credentials → Create Credentials → API Key");
    logWait("4. Restrict key to 'Map Tiles API' only");

    const key = await prompt("\n  📋 Paste your Google Maps API key (Enter to skip): ");

    if (key && key.length > 10) {
      writeEnvKey("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", key);
      logSuccess(`Google Maps key saved (${key.slice(0, 10)}...)`);
    } else {
      logInfo("Skipped Google Maps");
    }
  } catch (e) {
    console.error("  ❌ Google Maps error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Extended: GROQ ──────────────────────────────────────
async function signupGroq(browser) {
  logStep("EXTRA — GROQ (fast AI inference for DECIDE/ACT)");

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://console.groq.com/keys", { waitUntil: "domcontentloaded" });
    logInfo("Opened GROQ console");
    logWait("Sign up/log in with Google or GitHub");
    logWait("Go to API Keys → Create API Key");

    const key = await prompt("\n  📋 Paste your GROQ API key (Enter to skip): ");

    if (key && key.length > 10) {
      writeEnvKey("GROQ_API_KEY", key);
      logSuccess(`GROQ key saved (${key.slice(0, 12)}...)`);
    } else {
      logInfo("Skipped GROQ");
    }
  } catch (e) {
    console.error("  ❌ GROQ error:", e.message);
  } finally {
    await context.close();
  }
}

// ── Main ────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.indexOf("--service");
  const singleService = serviceArg !== -1 ? args[serviceArg + 1] : null;

  // ── Load config from encrypted vault ──
  if (fs.existsSync(VAULT_FILE)) {
    console.log("\n  🔒 Encrypted vault found.\n");
    const passphrase = await prompt("  Master passphrase: ");

    try {
      const vault = decryptVault(passphrase);
      USER = {
        firstName: vault.user.firstName,
        lastName: vault.user.lastName,
        email: vault.user.email,
        passwords: vault.passwords || {},
      };
      logSuccess("Vault decrypted");
    } catch {
      console.error("  ❌ Wrong passphrase or corrupted vault.");
      console.error("     Run 'npm run config' to reconfigure.");
      process.exit(1);
    }
  } else {
    console.log("\n  ⚠️  No vault found — run 'npm run config' first.\n");
    USER.firstName = (await prompt("  First name [James]: ")) || "James";
    USER.lastName = (await prompt("  Last name [Low]: ")) || "Low";
    USER.email = (await prompt("  Email: ")) || "james.low@universumventure.com";
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║            OODA — API Key Auto-Signup                    ║
║                                                          ║
║  Name:    ${(USER.firstName + " " + USER.lastName).padEnd(45)}║
║  Email:   ${USER.email.padEnd(45)}║
║  Purpose: Personal / testing only (non-commercial)       ║
║  Passwords: Apple-style, unique per platform             ║
╚══════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  try {
    const services = {
      nasa: signupNASA,
      cesium: signupCesium,
      aisstream: signupAISstream,
      openweather: signupOpenWeather,
      google: signupGoogle3DTiles,
      groq: signupGroq,
    };

    if (singleService) {
      const fn = services[singleService.toLowerCase()];
      if (fn) {
        await fn(browser);
      } else {
        console.error(`  Unknown service: ${singleService}`);
        console.log(`  Available: ${Object.keys(services).join(", ")}`);
      }
    } else {
      console.log("  Starting with the 4 core APIs...\n");

      await signupNASA(browser);
      await signupCesium(browser);
      await signupAISstream(browser);
      await signupOpenWeather(browser);

      const doExtras = await prompt("\n  Sign up for extended APIs too? (Google 3D Tiles, GROQ) [y/N]: ");
      if (doExtras.toLowerCase() === "y") {
        await signupGoogle3DTiles(browser);
        await signupGroq(browser);
      }
    }

    // Final summary
    console.log(`\n${"═".repeat(60)}`);
    console.log("  RESULTS — .env.local:");
    console.log(`${"═".repeat(60)}\n`);

    if (fs.existsSync(ENV_FILE)) {
      const lines = fs.readFileSync(ENV_FILE, "utf-8")
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"));
      for (const line of lines) {
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const k = line.slice(0, eq);
        const v = line.slice(eq + 1);
        const masked = v.length > 20 ? v.slice(0, 15) + "..." : v;
        console.log(`  ${k} = ${masked}`);
      }
    } else {
      console.log("  (no keys saved yet)");
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log("  Next: restart the dev server to load new keys");
    console.log("    npm run dev");
    console.log(`\n  Validate everything works:`);
    console.log("    npm run validate-keys");
    console.log(`${"═".repeat(60)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
