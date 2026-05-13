import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Settings API — Manage API keys through the browser UI
 *
 * GET  /api/settings        → Returns configured keys (masked)
 * POST /api/settings        → Updates keys → writes to .env.local
 *
 * Keys are stored in .env.local at the project root.
 * After saving, the server process picks them up on next restart.
 * For immediate effect, we also set them on process.env.
 */

// All supported API key configs
const API_KEY_DEFS = [
  {
    key: "AISSTREAM_API_KEY",
    label: "AISStream.io",
    description: "Live AIS vessel tracking via WebSocket",
    signupUrl: "https://aisstream.io",
    category: "maritime",
  },
  {
    key: "DATALASTIC_API_KEY",
    label: "Datalastic",
    description: "Free: 25 req/day. Supplementary AIS for Gulf, Hormuz, Panama (areas without AISstream coverage)",
    signupUrl: "https://datalastic.com/api-reference/",
    category: "maritime",
  },
  {
    key: "VESSELFINDER_CONTAINER_API_KEY",
    label: "VesselFinder Container",
    description: "Container tracking with vessel/port resolution",
    signupUrl: "https://www.vesselfinder.com/api",
    category: "container",
  },
  {
    key: "SEARATES_API_KEY",
    label: "Searates",
    description: "Container tracking and shipping rates",
    signupUrl: "https://www.searates.com/reference/tracking/",
    category: "container",
  },
  {
    key: "SHIPSGO_API_KEY",
    label: "ShipsGo",
    description: "Container tracking with route visualization",
    signupUrl: "https://shipsgo.com/api",
    category: "container",
  },
  {
    key: "TERMINAL49_API_KEY",
    label: "Terminal49",
    description: "Free tier: 50 containers/month, multi-carrier",
    signupUrl: "https://www.terminal49.com/signup",
    category: "container",
  },
  {
    key: "DOCKFLOW_API_KEY",
    label: "Dockflow",
    description: "Free tier: 30 lookups/month, real-time tracking",
    signupUrl: "https://www.dockflow.com/register",
    category: "container",
  },
  {
    key: "N2YO_API_KEY",
    label: "N2YO",
    description: "Satellite TLE data and pass predictions",
    signupUrl: "https://www.n2yo.com/api/",
    category: "satellite",
  },
  {
    key: "GDELT_ENABLED",
    label: "GDELT (No Key Required)",
    description: "Global event database — enabled by default",
    signupUrl: "",
    category: "news",
  },
];

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export async function GET() {
  const keys = API_KEY_DEFS.map((def) => {
    const value = process.env[def.key] || "";
    return {
      ...def,
      configured: !!value,
      maskedValue: maskKey(value),
    };
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, string> = body.keys || {};

    // Validate: only accept known keys
    const validKeys = new Set(API_KEY_DEFS.map((d) => d.key));
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (validKeys.has(k) && typeof v === "string") {
        filtered[k] = v.trim();
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json(
        { error: "No valid keys provided" },
        { status: 400 }
      );
    }

    // Read existing .env.local
    const envPath = join(process.cwd(), ".env.local");
    let existingContent = "";
    try {
      existingContent = await readFile(envPath, "utf-8");
    } catch {
      // File doesn't exist yet — that's fine
    }

    // Parse existing env vars
    const envLines = existingContent.split("\n");
    const envMap = new Map<string, string>();
    const comments: string[] = [];

    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        comments.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        envMap.set(key, val);
      }
    }

    // Apply updates
    let updatedCount = 0;
    for (const [k, v] of Object.entries(filtered)) {
      if (v) {
        envMap.set(k, v);
        // Also set on process.env for immediate effect (current process)
        process.env[k] = v;
        updatedCount++;
      } else {
        // Empty value = remove
        envMap.delete(k);
        delete process.env[k];
      }
    }

    // Write back .env.local
    const header = "# OODA Interface — API Keys\n# Managed via Settings UI\n";
    const lines: string[] = [header];
    const written = new Set<string>();

    // Separate known (managed) keys from unknown (user-added) keys
    const knownKeys = new Set(API_KEY_DEFS.map((d) => d.key));

    // Group known keys by category
    const categories = new Map<string, string[]>();
    for (const [key, val] of envMap) {
      const def = API_KEY_DEFS.find((d) => d.key === key);
      if (def) {
        const cat = def.category || "other";
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(`${key}=${val}`);
        written.add(key);
      }
    }

    // Write grouped managed keys
    for (const [cat, keyLines] of categories) {
      lines.push(`\n# ${cat.toUpperCase()}`);
      lines.push(...keyLines);
    }

    // Preserve any unknown keys from original file (not managed by us)
    const unknownEntries: string[] = [];
    for (const [key, val] of envMap) {
      if (!written.has(key)) {
        unknownEntries.push(`${key}=${val}`);
      }
    }
    if (unknownEntries.length > 0) {
      lines.push(`\n# OTHER`);
      lines.push(...unknownEntries);
    }

    await writeFile(envPath, lines.join("\n") + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `${updatedCount} key(s) saved. Keys are active immediately for API calls. Restart the server if needed for WebSocket connections.`,
    });
  } catch (err) {
    console.error("Settings API error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
