#!/usr/bin/env node

/**
 * OODA API Signup — Interactive Configuration
 *
 * Collects your personal details, generates Apple-style strong passwords,
 * encrypts everything with a master passphrase, and saves it.
 * Also stores each password in macOS Keychain for access from Safari/Chrome.
 *
 * Usage: node scripts/api-signup/config.mjs
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as crypto from "crypto";
import { execSync } from "child_process";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const VAULT_FILE = path.join(PROJECT_ROOT, ".api-vault.enc");

// ── Helpers ─────────────────────────────────────────────

function ask(question, defaultVal = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const suffix = defaultVal ? ` [${defaultVal}]` : "";
  return new Promise((resolve) => {
    rl.question(`  ${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

function askSecret(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`  ${question}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Generate Apple Keychain-style password
 * Format: xxxxxx-xxxxxx-xxxxxx (6 groups of mixed case + digits, hyphen-separated)
 * Similar to what macOS Passwords app generates
 */
function generateAppleStylePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function group(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += chars[crypto.randomInt(chars.length)];
    }
    return s;
  }
  // Apple style: 6char-6char-6char (20 chars total with hyphens)
  return `${group(6)}-${group(6)}-${group(6)}`;
}

/**
 * Encrypt JSON data with AES-256-GCM using a passphrase
 */
function encrypt(data, passphrase) {
  const salt = crypto.randomBytes(32);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const json = JSON.stringify(data, null, 2);
  let encrypted = cipher.update(json, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted,
  };
}

/**
 * Decrypt vault file
 */
export function decrypt(vaultPath, passphrase) {
  const raw = JSON.parse(fs.readFileSync(vaultPath, "utf-8"));
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

/**
 * Store a credential in macOS Keychain
 */
function storeInKeychain(service, account, password) {
  try {
    // Delete existing entry if any
    try {
      execSync(
        `security delete-generic-password -s "${service}" -a "${account}" 2>/dev/null`,
        { stdio: "pipe" }
      );
    } catch {}

    execSync(
      `security add-generic-password -s "${service}" -a "${account}" -w "${password}" -U`,
      { stdio: "pipe" }
    );
    return true;
  } catch {
    return false;
  }
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         OODA — API Signup Configuration                  ║
║                                                          ║
║  Configure your details, generate secure passwords,      ║
║  encrypt & store in macOS Keychain.                      ║
╚══════════════════════════════════════════════════════════╝
`);

  // ── 1. Personal details ──
  console.log("  ── YOUR DETAILS ──\n");

  const firstName = await ask("First name", "James");
  const lastName = await ask("Last name", "Low");
  const email = await ask("Email", "james.low@universumventure.com");

  // ── 2. Generate Apple-style passwords (unique per platform) ──
  console.log("\n  ── GENERATED PASSWORDS (Apple Keychain style) ──\n");

  const services = [
    { key: "cesium", name: "Cesium Ion", url: "ion.cesium.com", critical: true },
    { key: "aisstream", name: "AISstream", url: "aisstream.io", critical: true },
    { key: "nasa", name: "NASA API", url: "api.nasa.gov", critical: false },
    { key: "openweather", name: "OpenWeatherMap", url: "openweathermap.org", critical: false },
    { key: "google", name: "Google Cloud", url: "console.cloud.google.com", critical: false },
    { key: "groq", name: "GROQ", url: "console.groq.com", critical: false },
  ];

  const passwords = {};
  for (const svc of services) {
    passwords[svc.key] = generateAppleStylePassword();
    const tag = svc.critical ? "CRITICAL" : "optional";
    console.log(`  ${svc.name.padEnd(18)} [${tag}]  ${passwords[svc.key]}`);
  }

  // ── 3. Master passphrase ──
  console.log("\n  ── MASTER PASSPHRASE ──\n");
  console.log("  This encrypts all credentials in the vault file.");
  console.log("  You'll enter it once when running 'npm run signup'.\n");

  let passphrase = "";
  while (true) {
    passphrase = await askSecret("Master passphrase (min 6 chars)");
    if (passphrase.length < 6) {
      console.log("  Too short — minimum 6 characters.");
      continue;
    }
    const confirm = await askSecret("Confirm passphrase");
    if (passphrase !== confirm) {
      console.log("  Doesn't match — try again.");
      continue;
    }
    break;
  }

  // ── 4. Build vault ──
  const vault = {
    created: new Date().toISOString(),
    user: {
      firstName,
      lastName,
      email,
      purpose: "Personal use / testing only",
      commercial: false,
    },
    passwords,
    services: services.map((s) => ({
      key: s.key,
      name: s.name,
      url: s.url,
      username: email,
      password: passwords[s.key],
    })),
  };

  // ── 5. Encrypt and save ──
  const encrypted = encrypt(vault, passphrase);
  fs.writeFileSync(VAULT_FILE, JSON.stringify(encrypted, null, 2));
  console.log(`\n  🔒 Encrypted vault saved: .api-vault.enc`);

  // ── 6. Store in macOS Keychain ──
  console.log("  🔑 Storing in macOS Keychain...\n");

  let keychainCount = 0;
  for (const svc of services) {
    const ok = storeInKeychain(
      `OODA-${svc.name.replace(/\s+/g, "-")}`,
      email,
      passwords[svc.key]
    );
    if (ok) {
      console.log(`     ✓ ${svc.name} → Keychain (search "OODA-${svc.name.replace(/\s+/g, "-")}")`);
      keychainCount++;
    } else {
      console.log(`     ✗ ${svc.name} — Keychain store failed`);
    }
  }

  // Store master passphrase too
  const masterOk = storeInKeychain("OODA-MasterVault", email, passphrase);
  if (masterOk) {
    console.log(`     ✓ Master passphrase → Keychain (search "OODA-MasterVault")`);
  }

  // ── 7. Ensure gitignore ──
  const gitignorePath = path.join(PROJECT_ROOT, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, "utf-8");
    let modified = false;
    for (const entry of [".api-vault.enc", ".api-vault.json", ".api-credentials"]) {
      if (!gitignore.includes(entry)) {
        gitignore += `\n${entry}`;
        modified = true;
      }
    }
    if (modified) fs.writeFileSync(gitignorePath, gitignore);
  }

  // ── Summary ──
  console.log(`
${"═".repeat(60)}
  DONE

  Vault:     .api-vault.enc (AES-256-GCM encrypted)
  Keychain:  ${keychainCount} passwords + master passphrase stored
             Open Keychain Access → search "OODA" to view

  Purpose:   Personal use / testing only (non-commercial)
  Passwords: Apple-style unique per platform

  Next: npm run signup
${"═".repeat(60)}
`);
}

main().catch(console.error);
