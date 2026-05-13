import { NextResponse } from "next/server";
import type { Flight } from "@/types";

/**
 * OBSERVE: Global ADS-B Flight Tracking
 *
 * Uses airplanes.live (ADS-B Exchange) — free, no API key needed.
 * Queries multiple strategic regions in parallel for global coverage.
 * Deduplicates by ICAO hex code since regions can overlap.
 *
 * Server-side in-memory cache (15s TTL) prevents redundant upstream
 * calls from multiple browser tabs or the OODA loop.
 */

// ── In-memory cache ─────────────────────────────────────────────
let flightCache: { data: Flight[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15_000; // 15s — keeps upstream calls to ~4/min max

// Strategic query points — centers of our monitored chokepoints
// plus major air corridors and military-relevant airspaces
const QUERY_POINTS = [
  // Middle East / strategic chokepoints
  { lat: 26.5,  lon: 56.3,  radius: 250, label: "Hormuz/Gulf" },
  { lat: 12.6,  lon: 43.3,  radius: 250, label: "Bab-el-Mandeb/Red Sea" },
  { lat: 30.0,  lon: 32.5,  radius: 250, label: "Suez/Eastern Med" },

  // Asia-Pacific
  { lat: 1.5,   lon: 103.5, radius: 250, label: "Malacca/Singapore" },
  { lat: 12.0,  lon: 114.0, radius: 250, label: "South China Sea" },
  { lat: 24.0,  lon: 119.5, radius: 250, label: "Taiwan Strait" },

  // Europe
  { lat: 36.0,  lon: -5.5,  radius: 250, label: "Gibraltar/W Med" },
  { lat: 50.5,  lon: 0.0,   radius: 250, label: "English Channel" },

  // Americas / Africa
  { lat: 9.0,   lon: -79.5, radius: 250, label: "Panama" },
  { lat: -34.0, lon: 18.5,  radius: 250, label: "Cape of Good Hope" },
];

/**
 * ICAO hex address ranges → country code.
 * Each ICAO 24-bit address is allocated in blocks to countries.
 * Source: https://www.icao.int/publications/DOC8643
 */
const ICAO_RANGES: [number, number, string][] = [
  // hex start, hex end (inclusive), ISO country code
  [0x000000, 0x003FFF, "ZW"],  // Zimbabwe
  [0x004000, 0x0043FF, "MZ"],  // Mozambique
  [0x006000, 0x006FFF, "ZA"],  // South Africa
  [0x008000, 0x00FFFF, "EG"],  // Egypt
  [0x010000, 0x017FFF, "LY"],  // Libya
  [0x018000, 0x01FFFF, "MA"],  // Morocco
  [0x020000, 0x027FFF, "TN"],  // Tunisia
  [0x040000, 0x04FFFF, "KE"],  // Kenya
  [0x050000, 0x050FFF, "TZ"],  // Tanzania
  [0x054000, 0x054FFF, "ET"],  // Ethiopia
  [0x060000, 0x067FFF, "NG"],  // Nigeria
  [0x080000, 0x080FFF, "GH"],  // Ghana
  [0x09C000, 0x09CFFF, "DZ"],  // Algeria
  [0x0A0000, 0x0A7FFF, "SD"],  // Sudan
  [0x200000, 0x27FFFF, "RU"],  // Russia
  [0x300000, 0x33FFFF, "IT"],  // Italy
  [0x340000, 0x37FFFF, "ES"],  // Spain
  [0x380000, 0x3BFFFF, "FR"],  // France
  [0x3C0000, 0x3FFFFF, "DE"],  // Germany
  [0x400000, 0x43FFFF, "GB"],  // United Kingdom
  [0x440000, 0x447FFF, "AT"],  // Austria
  [0x448000, 0x44FFFF, "BE"],  // Belgium
  [0x450000, 0x457FFF, "BG"],  // Bulgaria
  [0x458000, 0x45FFFF, "DK"],  // Denmark
  [0x460000, 0x467FFF, "FI"],  // Finland
  [0x468000, 0x46FFFF, "GR"],  // Greece
  [0x470000, 0x477FFF, "HU"],  // Hungary
  [0x478000, 0x47FFFF, "NO"],  // Norway
  [0x480000, 0x487FFF, "NL"],  // Netherlands
  [0x488000, 0x48FFFF, "PL"],  // Poland
  [0x490000, 0x497FFF, "PT"],  // Portugal
  [0x498000, 0x49FFFF, "CZ"],  // Czech Republic
  [0x4A0000, 0x4A7FFF, "RO"],  // Romania
  [0x4A8000, 0x4AFFFF, "SE"],  // Sweden
  [0x4B0000, 0x4B7FFF, "CH"],  // Switzerland
  [0x4B8000, 0x4BFFFF, "TR"],  // Turkey
  [0x4C0000, 0x4C7FFF, "RS"],  // Serbia
  [0x4CA000, 0x4CAFFF, "HR"],  // Croatia
  [0x4CC000, 0x4CCFFF, "SK"],  // Slovakia
  [0x4D0000, 0x4D03FF, "SI"],  // Slovenia
  [0x4D2000, 0x4D23FF, "IE"],  // Ireland
  [0x500000, 0x5003FF, "IS"],  // Iceland
  [0x501000, 0x5013FF, "LT"],  // Lithuania
  [0x501C00, 0x501FFF, "LV"],  // Latvia
  [0x502C00, 0x502FFF, "EE"],  // Estonia
  [0x503000, 0x5033FF, "LU"],  // Luxembourg
  [0x505000, 0x5053FF, "MT"],  // Malta
  [0x508000, 0x50FFFF, "UA"],  // Ukraine
  [0x600000, 0x6003FF, "BY"],  // Belarus
  [0x680000, 0x6803FF, "CY"],  // Cyprus
  [0x700000, 0x700FFF, "IL"],  // Israel
  [0x710000, 0x717FFF, "JO"],  // Jordan
  [0x718000, 0x71FFFF, "LB"],  // Lebanon
  [0x720000, 0x727FFF, "SY"],  // Syria
  [0x738000, 0x73FFFF, "IQ"],  // Iraq
  [0x740000, 0x747FFF, "IR"],  // Iran
  [0x748000, 0x74FFFF, "SA"],  // Saudi Arabia (partial)
  [0x750000, 0x757FFF, "SA"],  // Saudi Arabia
  [0x760000, 0x767FFF, "QA"],  // Qatar
  [0x768000, 0x76FFFF, "AE"],  // UAE
  [0x780000, 0x7BFFFF, "KR"],  // South Korea
  [0x7C0000, 0x7FFFFF, "AU"],  // Australia
  [0x800000, 0x83FFFF, "IN"],  // India
  [0x840000, 0x87FFFF, "JP"],  // Japan
  [0x880000, 0x887FFF, "TH"],  // Thailand
  [0x890000, 0x890FFF, "VN"],  // Vietnam
  [0x894000, 0x894FFF, "HK"],  // Hong Kong
  [0x895000, 0x8953FF, "MY"],  // Malaysia
  [0x896000, 0x896FFF, "PH"],  // Philippines
  [0x897000, 0x8973FF, "ID"],  // Indonesia
  [0x898000, 0x898FFF, "SG"],  // Singapore
  [0x899000, 0x8993FF, "PK"],  // Pakistan
  [0x8A0000, 0x8A7FFF, "TW"],  // Taiwan
  [0xA00000, 0xAFFFFF, "US"],  // United States
  [0xC00000, 0xC3FFFF, "CA"],  // Canada
  [0xC80000, 0xC87FFF, "NZ"],  // New Zealand
  [0xE00000, 0xE3FFFF, "AR"],  // Argentina
  [0xE40000, 0xE7FFFF, "BR"],  // Brazil
  [0xE80000, 0xE80FFF, "CL"],  // Chile
  [0xE84000, 0xE84FFF, "CO"],  // Colombia
  [0xE88000, 0xE88FFF, "MX"],  // Mexico
  [0xE8C000, 0xE8CFFF, "VE"],  // Venezuela
  [0xE90000, 0xE90FFF, "PE"],  // Peru
  [0xF00000, 0xF07FFF, "CN"],  // China (partial — ICAO uses 780000-7BFFFF too)
];

/**
 * Aircraft registration prefix → country code.
 * Registration prefix is the most reliable country indicator.
 * Sorted longest-prefix-first for correct matching.
 */
const REG_PREFIXES: [string, string][] = [
  // Multi-char prefixes first
  ["A6-", "AE"],  // UAE
  ["A7-", "QA"],  // Qatar
  ["A9C-", "BH"], // Bahrain
  ["AP-", "PK"],  // Pakistan
  ["B-", "CN"],   // China (and Taiwan)
  ["C-", "CA"],   // Canada
  ["CC-", "CL"],  // Chile
  ["CN-", "MA"],  // Morocco
  ["CP-", "BO"],  // Bolivia
  ["CS-", "PT"],  // Portugal
  ["CU-", "CU"],  // Cuba
  ["D-", "DE"],   // Germany
  ["EC-", "ES"],  // Spain
  ["EI-", "IE"],  // Ireland
  ["EK-", "AM"],  // Armenia
  ["EP-", "IR"],  // Iran
  ["ET-", "ET"],  // Ethiopia
  ["EW-", "BY"],  // Belarus
  ["EX-", "KG"],  // Kyrgyzstan
  ["EZ-", "TM"],  // Turkmenistan
  ["F-", "FR"],   // France
  ["G-", "GB"],   // United Kingdom
  ["HA-", "HU"],  // Hungary
  ["HB-", "CH"],  // Switzerland
  ["HC-", "EC"],  // Ecuador
  ["HI-", "DO"],  // Dominican Republic
  ["HK-", "CO"],  // Colombia
  ["HL", "KR"],   // South Korea (no dash)
  ["HP-", "PA"],  // Panama
  ["HR-", "HN"],  // Honduras
  ["HS-", "TH"],  // Thailand
  ["HZ-", "SA"],  // Saudi Arabia
  ["I-", "IT"],   // Italy
  ["JA", "JP"],   // Japan (no dash)
  ["JU-", "MN"],  // Mongolia
  ["JY-", "JO"],  // Jordan
  ["LN-", "NO"],  // Norway
  ["LV-", "AR"],  // Argentina
  ["LX-", "LU"],  // Luxembourg
  ["LY-", "LT"],  // Lithuania
  ["LZ-", "BG"],  // Bulgaria
  ["N", "US"],    // United States (single letter, no dash)
  ["OB-", "PE"],  // Peru
  ["OD-", "LB"],  // Lebanon
  ["OE-", "AT"],  // Austria
  ["OH-", "FI"],  // Finland
  ["OK-", "CZ"],  // Czech Republic
  ["OM-", "SK"],  // Slovakia
  ["OO-", "BE"],  // Belgium
  ["OY-", "DK"],  // Denmark
  ["P-", "KP"],   // North Korea
  ["PH-", "NL"],  // Netherlands
  ["PK-", "ID"],  // Indonesia
  ["PP-", "BR"],  // Brazil
  ["PR-", "BR"],  // Brazil
  ["PT-", "BR"],  // Brazil
  ["RA-", "RU"],  // Russia
  ["RDPL-", "LA"],// Laos
  ["RP-C", "PH"], // Philippines
  ["SE-", "SE"],  // Sweden
  ["SP-", "PL"],  // Poland
  ["ST-", "SD"],  // Sudan
  ["SU-", "EG"],  // Egypt
  ["SX-", "GR"],  // Greece
  ["S2-", "BD"],  // Bangladesh
  ["S5-", "SI"],  // Slovenia
  ["TC-", "TR"],  // Turkey
  ["TF-", "IS"],  // Iceland
  ["TI-", "CR"],  // Costa Rica
  ["TS-", "TN"],  // Tunisia
  ["TT-", "TD"],  // Chad
  ["UK-", "UZ"],  // Uzbekistan
  ["UN-", "KZ"],  // Kazakhstan
  ["UR-", "UA"],  // Ukraine
  ["VH-", "AU"],  // Australia
  ["VN-", "VN"],  // Vietnam
  ["VP-B", "BM"], // Bermuda
  ["VP-C", "KY"], // Cayman Islands
  ["VQ-B", "BM"], // Bermuda
  ["VT-", "IN"],  // India
  ["XA-", "MX"],  // Mexico
  ["XB-", "MX"],  // Mexico
  ["XC-", "MX"],  // Mexico
  ["YI-", "IQ"],  // Iraq
  ["YK-", "SY"],  // Syria
  ["YR-", "RO"],  // Romania
  ["YU-", "RS"],  // Serbia
  ["ZK-", "NZ"],  // New Zealand
  ["ZS-", "ZA"],  // South Africa
  ["4R-", "LK"],  // Sri Lanka
  ["4X-", "IL"],  // Israel
  ["5A-", "LY"],  // Libya
  ["5B-", "CY"],  // Cyprus
  ["5H-", "TZ"],  // Tanzania
  ["5N-", "NG"],  // Nigeria
  ["5Y-", "KE"],  // Kenya
  ["7O-", "YE"],  // Yemen
  ["7T-", "DZ"],  // Algeria
  ["8P-", "BB"],  // Barbados
  ["8Q-", "MV"],  // Maldives
  ["9A-", "HR"],  // Croatia
  ["9G-", "GH"],  // Ghana
  ["9H-", "MT"],  // Malta
  ["9K-", "KW"],  // Kuwait
  ["9M-", "MY"],  // Malaysia
  ["9N-", "NP"],  // Nepal
  ["9V-", "SG"],  // Singapore
  ["9XR-", "RW"], // Rwanda
  ["9Y-", "TT"],  // Trinidad & Tobago
];

function regToCountry(reg: string): string {
  if (!reg || reg === "TWR" || reg === "GND") return "";
  const upper = reg.toUpperCase();
  for (const [prefix, code] of REG_PREFIXES) {
    if (upper.startsWith(prefix)) return code;
  }
  return "";
}

function icaoToCountry(hex: string): string {
  if (!hex) return "";
  const addr = parseInt(hex, 16);
  if (isNaN(addr)) return "";

  for (const [start, end, code] of ICAO_RANGES) {
    if (addr >= start && addr <= end) return code;
  }
  return "";
}

function parseAircraft(ac: Record<string, unknown>): Flight | null {
  if (!ac.lat || !ac.lon) return null;

  // Skip ground stations and towers — not real aircraft
  const reg = (ac.r as string) || "";
  if (reg === "TWR" || reg === "GND") return null;

  const hex = (ac.hex as string) || "";
  // Registration prefix is most reliable; fall back to ICAO hex range
  const country = regToCountry(reg) || icaoToCountry(hex);

  return {
    icao24: hex,
    callsign: ((ac.flight as string) || "").trim(),
    originCountry: country,
    registration: reg,
    aircraftType: (ac.desc as string) || (ac.t as string) || "",
    longitude: ac.lon as number,
    latitude: ac.lat as number,
    baroAltitude: typeof ac.alt_baro === "number" ? ac.alt_baro : null,
    onGround: ac.alt_baro === "ground" || ac.ground === true,
    velocity: (ac.gs as number) || null,
    trueTrack: (ac.track as number) || null,
    verticalRate: (ac.baro_rate as number) || null,
    geoAltitude: (ac.alt_geom as number) || null,
    squawk: (ac.squawk as string) || null,
    lastContact: (ac.seen as number) || 0,
  };
}

export async function GET() {
  try {
    // Serve from cache if fresh
    if (flightCache && Date.now() - flightCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json(flightCache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=10",
          "X-Cache": "HIT",
        },
      });
    }

    // Fetch all regions in parallel
    const results = await Promise.allSettled(
      QUERY_POINTS.map(async (point) => {
        const url = `https://api.airplanes.live/v2/point/${point.lat}/${point.lon}/${point.radius}`;
        const res = await fetch(url, { next: { revalidate: 15 } });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.ac || []) as Record<string, unknown>[];
      })
    );

    // Deduplicate by ICAO hex — regions can overlap
    const seen = new Set<string>();
    const flights: Flight[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const ac of result.value) {
        const hex = (ac.hex as string) || "";
        if (!hex || seen.has(hex)) continue;
        seen.add(hex);

        const flight = parseAircraft(ac);
        if (flight) flights.push(flight);
      }
    }

    // Update cache
    flightCache = { data: flights, fetchedAt: Date.now() };

    return NextResponse.json(flights, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=10",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Flight API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
