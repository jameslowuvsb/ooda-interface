/**
 * AISstream WebSocket Client
 *
 * Simple connection manager that persists across Turbopack hot reloads
 * via globalThis. Connects to wss://stream.aisstream.io/v0/stream and
 * caches vessel positions in a Map.
 */

import type { Vessel } from "@/types";

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

// Strategic chokepoints — 10 bounding boxes (AISstream max)
// Wider boxes for regions with sparse terrestrial AIS receiver coverage
const STRATEGIC_REGIONS = [
  [[ 23.0,  48.0], [ 30.0,  58.5]],  // Persian Gulf + Hormuz (wider: full Gulf coast)
  [[  9.0,  41.0], [ 16.0,  46.0]],  // Bab-el-Mandeb + Gulf of Aden (wider)
  [[ 27.0,  32.0], [ 32.0,  35.0]],  // Suez Canal + Red Sea north
  [[ -2.0,  99.0], [  4.0, 105.0]],  // Malacca Strait
  [[  1.0, 103.0], [ 16.0, 118.0]],  // South China Sea (wider: Singapore to Philippines)
  [[ 34.0,  -8.0], [ 38.0,  -3.0]],  // Gibraltar + western Med
  [[ 49.0,  -3.0], [ 52.0,   3.0]],  // English Channel + North Sea south
  [[ 22.0, 116.0], [ 26.5, 122.0]],  // Taiwan Strait (wider)
  [[  7.0, -81.0], [ 11.0, -77.0]],  // Panama + Caribbean approach (wider)
  [[-36.0,  16.0], [-33.0,  22.0]],  // Cape of Good Hope (wider)
];

function getShipTypeFromAIS(code: number): string {
  if (code >= 80 && code < 90) return "Tanker";
  if (code >= 70 && code < 80) return "Cargo";
  if (code >= 60 && code < 70) return "Passenger";
  if (code >= 40 && code < 50) return "HSC";
  if (code === 30) return "Fishing";
  if (code >= 31 && code <= 32) return "Towing";
  if (code === 35) return "Military";
  if (code === 52) return "Tug";
  if (code === 55) return "Law Enforcement";
  return "Unknown";
}

// ── Global State (survives Turbopack hot reloads) ─────────────

interface AISState {
  vessels: Map<string, { vessel: Vessel; lastSeen: number; typeCode: number }>;
  connected: boolean;
  messageCount: number;
  lastMessageTime: number;
  wsRef: unknown | null;       // WebSocket reference
  cleanupRef: unknown | null;  // Cleanup interval
  reconnectRef: unknown | null; // Auto-reconnect timer
  initTime: number;
  reconnectAttempts: number;
}

const STATE_KEY = "__aisstream_state_v2__";

// Clean up old class-based singleton if it exists
const _g = globalThis as unknown as Record<string, unknown>;
if (_g.__aisstream_client__) {
  try {
    const old = _g.__aisstream_client__ as { destroy?: () => void };
    old.destroy?.();
  } catch {}
  delete _g.__aisstream_client__;
}

function getState(): AISState {
  const g = globalThis as unknown as Record<string, AISState>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = {
      vessels: new Map(),
      connected: false,
      messageCount: 0,
      lastMessageTime: 0,
      wsRef: null,
      cleanupRef: null,
      reconnectRef: null,
      initTime: 0,
      reconnectAttempts: 0,
    };
  }
  return g[STATE_KEY];
}

// ── Auto-reconnect ──────────────────────────────────────────

function scheduleReconnect(state: AISState) {
  // Clear any existing reconnect timer
  if (state.reconnectRef) {
    clearTimeout(state.reconnectRef as ReturnType<typeof setTimeout>);
    state.reconnectRef = null;
  }

  state.reconnectAttempts++;

  // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
  const delay = Math.min(5000 * Math.pow(2, state.reconnectAttempts - 1), 60_000);
  console.log(`[AISstream] Reconnecting in ${delay / 1000}s (attempt ${state.reconnectAttempts})`);

  state.reconnectRef = setTimeout(() => {
    state.reconnectRef = null;
    state.initTime = 0; // Reset throttle so ensureConnected will run
    ensureConnected().catch((err) => {
      console.error("[AISstream] Reconnect failed:", err);
    });
  }, delay);
}

// ── Connect ──────────────────────────────────────────────────

async function ensureConnected(): Promise<void> {
  const state = getState();
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) return;

  // Heartbeat check: if "connected" but no messages in 5 minutes, it's a zombie
  if (state.connected && state.lastMessageTime > 0) {
    const silentMs = Date.now() - state.lastMessageTime;
    if (silentMs > 5 * 60 * 1000) {
      console.log(`[AISstream] Zombie detected — no messages in ${Math.round(silentMs / 1000)}s, forcing reconnect`);
      state.connected = false;
      if (state.wsRef) {
        try { (state.wsRef as { close: () => void }).close(); } catch {}
        state.wsRef = null;
      }
    }
  }

  // Already connected (and not zombie)
  if (state.connected) return;

  // Recently attempted (avoid rapid reconnects)
  if (state.initTime && Date.now() - state.initTime < 10_000) return;

  state.initTime = Date.now();

  try {
    // Dynamic import to guarantee Node.js ws resolution
    const { default: WebSocket } = await import("ws");

    // Close any lingering socket
    if (state.wsRef) {
      try { (state.wsRef as { close: () => void }).close(); } catch {}
      state.wsRef = null;
    }

    console.log("[AISstream] Connecting...");
    const ws = new WebSocket(AISSTREAM_URL);
    state.wsRef = ws;

    ws.on("open", () => {
      console.log("[AISstream] Connected — subscribing to", STRATEGIC_REGIONS.length, "regions");
      state.connected = true;
      state.reconnectAttempts = 0;

      // Use strategic regions for targeted monitoring
      const subscription = {
        APIKey: apiKey,
        BoundingBoxes: STRATEGIC_REGIONS,
      };
      console.log("[AISstream] Sending subscription:", JSON.stringify(subscription).slice(0, 200));
      ws.send(JSON.stringify(subscription));
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        processMessage(state, msg);
      } catch {}
    });

    ws.on("close", (code, reason) => {
      console.log("[AISstream] Disconnected — code:", code, "reason:", reason?.toString());
      state.connected = false;
      state.wsRef = null;
      scheduleReconnect(state);
    });

    ws.on("error", (err) => {
      console.error("[AISstream] Error:", (err as Error).message);
      state.connected = false;
      try { ws.close(); } catch {}
      state.wsRef = null;
      scheduleReconnect(state);
    });

    // Start stale-vessel cleanup if not already running
    if (!state.cleanupRef) {
      state.cleanupRef = setInterval(() => {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000;
        for (const [mmsi, cached] of state.vessels) {
          if (now - cached.lastSeen > maxAge) state.vessels.delete(mmsi);
        }
      }, 5 * 60 * 1000);
    }
  } catch (err) {
    console.error("[AISstream] Connection failed:", err);
    state.connected = false;
    state.wsRef = null;
  }
}

// ── Message Processing ──────────────────────────────────────

interface AISMeta {
  MMSI: number;
  MMSI_String?: string;
  ShipName?: string;
  latitude: number;
  longitude: number;
}

function processMessage(state: AISState, msg: Record<string, unknown>) {
  state.messageCount++;
  state.lastMessageTime = Date.now();

  const meta = msg.MetaData as AISMeta | undefined;
  if (!meta) return;

  const mmsi = meta.MMSI_String || String(meta.MMSI);
  const lat = meta.latitude;
  const lon = meta.longitude;

  // Skip invalid positions
  if ((lat === 0 && lon === 0) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

  const existing = state.vessels.get(mmsi);
  const message = msg.Message as Record<string, Record<string, unknown>> | undefined;
  if (!message) return;

  // Position reports
  const report = message.PositionReport || message.StandardClassBCSPositionReport;
  if (report) {
    const cog = typeof report.Cog === "number" ? report.Cog : 0;
    const sog = typeof report.Sog === "number" ? report.Sog : 0;
    const heading = typeof report.TrueHeading === "number" && report.TrueHeading !== 511
      ? report.TrueHeading : cog;

    const vessel: Vessel = {
      mmsi,
      name: (meta.ShipName?.trim()) || existing?.vessel.name || "Unknown",
      latitude: lat,
      longitude: lon,
      course: cog,
      speed: sog,
      heading,
      shipType: existing?.vessel.shipType || "Unknown",
      flag: existing?.vessel.flag || "",
      destination: existing?.vessel.destination || "",
      lastUpdate: Date.now(),
    };

    state.vessels.set(mmsi, {
      vessel,
      lastSeen: Date.now(),
      typeCode: existing?.typeCode || 0,
    });
  }

  // Static data (ship type, name, destination)
  const staticData = message.ShipStaticData;
  if (staticData) {
    const cached = state.vessels.get(mmsi);
    const shipType = getShipTypeFromAIS(typeof staticData.Type === "number" ? staticData.Type : 0);
    const name = typeof staticData.Name === "string" ? staticData.Name.trim() : "";
    const destination = typeof staticData.Destination === "string" ? staticData.Destination.trim() : "";

    if (cached) {
      if (name) cached.vessel.name = name;
      cached.vessel.shipType = shipType;
      if (destination) cached.vessel.destination = destination;
      cached.typeCode = typeof staticData.Type === "number" ? staticData.Type : 0;
      cached.lastSeen = Date.now();
    } else {
      state.vessels.set(mmsi, {
        vessel: {
          mmsi, name: name || "Unknown",
          latitude: lat, longitude: lon,
          course: 0, speed: 0, heading: 0,
          shipType, flag: "", destination,
          lastUpdate: Date.now(),
        },
        lastSeen: Date.now(),
        typeCode: typeof staticData.Type === "number" ? staticData.Type : 0,
      });
    }
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Initialize the AISstream connection (call from route handler).
 * Safe to call multiple times — only connects once.
 */
export async function initAISStream(): Promise<void> {
  await ensureConnected();
}

/**
 * Get all tracked vessels.
 */
export function getTrackedVessels(): Vessel[] {
  const state = getState();
  return Array.from(state.vessels.values()).map((c) => c.vessel);
}

/**
 * Get connection stats.
 */
export function getAISStats() {
  const state = getState();
  return {
    connected: state.connected,
    vesselCount: state.vessels.size,
    messageCount: state.messageCount,
    lastMessageTime: state.lastMessageTime,
    regions: STRATEGIC_REGIONS.length,
  };
}

/**
 * Force reconnect — closes the current WebSocket and reconnects
 * with the latest bounding box config. Call after changing regions.
 */
export async function forceReconnect(): Promise<void> {
  const state = getState();
  state.connected = false;
  state.initTime = 0;
  if (state.wsRef) {
    try { (state.wsRef as { close: () => void }).close(); } catch {}
    state.wsRef = null;
  }
  if (state.reconnectRef) {
    clearTimeout(state.reconnectRef as ReturnType<typeof setTimeout>);
    state.reconnectRef = null;
  }
  console.log("[AISstream] Force reconnect requested");
  await ensureConnected();
}
