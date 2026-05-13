import { NextResponse } from "next/server";
import type { Satellite } from "@/types";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";

// CelesTrak TLE data — no API key needed
const TLE_URLS = [
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
];

let tleCache: { lines: string[]; fetchedAt: number } | null = null;
const CACHE_TTL = 3600_000; // 1 hour — TLEs don't change often

async function fetchTLEs(): Promise<string[]> {
  if (tleCache && Date.now() - tleCache.fetchedAt < CACHE_TTL) {
    return tleCache.lines;
  }

  // Active sats is large — use a smaller group for initial load
  const url =
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CelesTrak error: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  tleCache = { lines, fetchedAt: Date.now() };
  return lines;
}

export async function GET() {
  try {
    const lines = await fetchTLEs();
    const now = new Date();
    const gmst = gstime(now);
    const satellites: Satellite[] = [];

    for (let i = 0; i < lines.length - 2; i += 3) {
      const name = lines[i].trim();
      const line1 = lines[i + 1]?.trim();
      const line2 = lines[i + 2]?.trim();

      if (!line1 || !line2) continue;

      try {
        const satrec = twoline2satrec(line1, line2);
        const posVel = propagate(satrec, now);

        if (
          !posVel ||
          !posVel.position ||
          typeof posVel.position === "boolean"
        )
          continue;

        const pos = posVel.position as { x: number; y: number; z: number };
        const vel = posVel.velocity as { x: number; y: number; z: number };
        const geo = eciToGeodetic(pos, gmst);

        const speed = Math.sqrt(
          vel.x * vel.x + vel.y * vel.y + vel.z * vel.z
        );

        satellites.push({
          id: parseInt(satrec.satnum, 10) || 0,
          name,
          latitude: degreesLat(geo.latitude),
          longitude: degreesLong(geo.longitude),
          altitude: geo.height,
          velocity: speed,
          category: "station",
        });
      } catch {
        // Skip bad TLE entries
      }
    }

    return NextResponse.json(satellites, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
      },
    });
  } catch (error) {
    console.error("Satellite API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
