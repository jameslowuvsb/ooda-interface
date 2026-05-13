import { NextResponse } from "next/server";
import type { Vessel } from "@/types";
import { initAISStream, getTrackedVessels, getAISStats, forceReconnect } from "@/lib/aisstream-client";
import { ingestBatch } from "@/lib/maritime/fusion-engine";

/**
 * OBSERVE: Real-time AIS Vessel Tracking
 *
 * Uses AISstream.io WebSocket for live vessel positions.
 * Returns ONLY real AIS data — no simulated vessels.
 *
 * Coverage: 10 strategic chokepoints (Hormuz, Suez, Malacca, etc.)
 * Update frequency: Real-time streaming (positions arrive every 2-180s per vessel)
 */

// Ship type codes from AIS
function getShipType(code: number): string {
  if (code >= 60 && code < 70) return "Passenger";
  if (code >= 70 && code < 80) return "Cargo";
  if (code >= 80 && code < 90) return "Tanker";
  const SHIP_TYPES: Record<number, string> = {
    0: "Unknown", 30: "Fishing", 31: "Towing", 32: "Towing (large)",
    33: "Dredging", 34: "Diving Ops", 35: "Military Ops", 36: "Sailing",
    37: "Pleasure Craft", 40: "HSC", 50: "Pilot Vessel", 51: "Search & Rescue",
    52: "Tug", 53: "Port Tender", 55: "Law Enforcement", 60: "Passenger",
    70: "Cargo", 80: "Tanker", 89: "Tanker (other)", 90: "Other",
  };
  return SHIP_TYPES[code] || "Unknown";
}

// Strategic region bounding boxes (for optional filtering)
interface RegionBBox {
  id: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

const STRATEGIC_BBOXES: RegionBBox[] = [
  { id: "hormuz",    latMin: 23.0, latMax: 30.0, lonMin: 48.0,  lonMax: 58.5  },
  { id: "bab",       latMin:  9.0, latMax: 16.0, lonMin: 41.0,  lonMax: 46.0  },
  { id: "suez",      latMin: 27.0, latMax: 32.0, lonMin: 32.0,  lonMax: 35.0  },
  { id: "malacca",   latMin: -2.0, latMax:  4.0, lonMin: 99.0,  lonMax: 105.0 },
  { id: "scs",       latMin:  1.0, latMax: 16.0, lonMin: 103.0, lonMax: 118.0 },
  { id: "gibraltar",  latMin: 34.0, latMax: 38.0, lonMin: -8.0,  lonMax: -3.0  },
  { id: "channel",   latMin: 49.0, latMax: 52.0, lonMin: -3.0,  lonMax:  3.0  },
  { id: "taiwan",    latMin: 22.0, latMax: 26.5, lonMin: 116.0, lonMax: 122.0 },
  { id: "panama",    latMin:  7.0, latMax: 11.0, lonMin: -81.0, lonMax: -77.0 },
  { id: "cape",      latMin: -36.0, latMax: -33.0, lonMin: 16.0, lonMax: 22.0 },
];

export async function GET(request: Request) {
  try {
    // Ensure WebSocket is connected (no-op if already connected)
    await initAISStream();

    const url = new URL(request.url);
    const statsOnly = url.searchParams.get("stats") === "true";

    // If stats requested, return connection info
    if (statsOnly) {
      const stats = getAISStats();
      return NextResponse.json(stats);
    }

    // Force reconnect (to pick up new bounding boxes)
    const reconnect = url.searchParams.get("reconnect") === "true";
    if (reconnect) {
      await forceReconnect();
      return NextResponse.json({ reconnected: true, stats: getAISStats() });
    }

    // Get real AIS data from the WebSocket cache
    const vessels = getTrackedVessels();

    // Optional: filter by region if query params provided
    const regionFilter = url.searchParams.get("region");
    if (regionFilter) {
      const bbox = STRATEGIC_BBOXES.find((r) => r.id === regionFilter);
      if (bbox) {
        const filtered = vessels.filter(
          (v) =>
            v.latitude >= bbox.latMin &&
            v.latitude <= bbox.latMax &&
            v.longitude >= bbox.lonMin &&
            v.longitude <= bbox.lonMax
        );
        return NextResponse.json(filtered);
      }
    }

    // Supplementary: Use Datalastic for regions with no AIS coverage
    const datalasticKey = process.env.DATALASTIC_API_KEY;
    if (datalasticKey) {
      const supplementary = await fetchDatalasticSupplementary(vessels, datalasticKey);
      if (supplementary.length > 0) {
        vessels.push(...supplementary);
      }
    }

    // Feed into maritime fusion engine for multi-source analysis
    ingestBatch(vessels);

    return NextResponse.json(vessels, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    });
  } catch (error) {
    console.error("Vessel API error:", error);
    return NextResponse.json([]);
  }
}

// ── Datalastic Supplementary Source ────────────────────────

// Regions that need supplementary data (AISstream has no coverage)
const SUPPLEMENT_REGIONS = [
  { id: "hormuz", latMin: 23.0, latMax: 30.0, lonMin: 48.0, lonMax: 58.5 },
  { id: "bab",    latMin:  9.0, latMax: 16.0, lonMin: 41.0, lonMax: 46.0 },
  { id: "panama", latMin:  7.0, latMax: 11.0, lonMin: -81.0, lonMax: -77.0 },
];

// Cache Datalastic results (25 req/day limit — cache for 10 minutes)
let datalasticCache: { vessels: Vessel[]; timestamp: number } = { vessels: [], timestamp: 0 };
const DATALASTIC_CACHE_TTL = 10 * 60_000;

// Rotate which uncovered region we query each call (25 req/day budget)
let datalasticRegionIdx = 0;

async function fetchDatalasticSupplementary(
  existingVessels: Vessel[],
  apiKey: string
): Promise<Vessel[]> {
  // Return cache if fresh
  if (Date.now() - datalasticCache.timestamp < DATALASTIC_CACHE_TTL) {
    return datalasticCache.vessels;
  }

  // Check which supplementary regions have zero AIS vessels
  const emptyRegions = SUPPLEMENT_REGIONS.filter((r) => {
    return !existingVessels.some(
      (v) => v.latitude >= r.latMin && v.latitude <= r.latMax &&
             v.longitude >= r.lonMin && v.longitude <= r.lonMax
    );
  });

  if (emptyRegions.length === 0) return [];

  // Pick one region to query (rotate to spread API usage)
  const region = emptyRegions[datalasticRegionIdx % emptyRegions.length];
  datalasticRegionIdx++;

  try {
    const params = new URLSearchParams({
      "api-key": apiKey,
      lat_min: region.latMin.toString(),
      lat_max: region.latMax.toString(),
      lon_min: region.lonMin.toString(),
      lon_max: region.lonMax.toString(),
    });

    const res = await fetch(
      `https://api.datalastic.com/api/v0/vessel_find?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (res.ok) {
      const data = await res.json();
      const existingMmsis = new Set(existingVessels.map((v) => v.mmsi));

      const supplementary: Vessel[] = ((data.data || []) as Record<string, unknown>[])
        .filter((v) => !existingMmsis.has(String(v.mmsi || "")))
        .map((v) => ({
          mmsi: String(v.mmsi || ""),
          name: String(v.ship_name || "Unknown"),
          latitude: Number(v.lat) || 0,
          longitude: Number(v.lon) || 0,
          course: Number(v.course) || 0,
          speed: Number(v.speed) || 0,
          heading: Number(v.heading) || 0,
          shipType: getShipType(Number(v.ship_type) || 0),
          flag: String(v.country_iso || ""),
          destination: String(v.destination || ""),
          lastUpdate: Date.now(),
        }));

      datalasticCache = { vessels: supplementary, timestamp: Date.now() };
      console.log(`[Datalastic] ${region.id}: ${supplementary.length} supplementary vessels`);
      return supplementary;
    }
  } catch (err) {
    console.warn("[Datalastic] Fetch failed:", (err as Error).message);
  }

  return [];
}
