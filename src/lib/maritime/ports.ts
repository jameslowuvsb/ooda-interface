/**
 * World Port Database — Strategic ports for maritime fusion
 *
 * Used for automatic port-call detection via proximity analysis.
 * Covers oil terminals, container hubs, naval bases, and STS zones.
 */

export interface Port {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  type: "oil_terminal" | "container" | "naval" | "general" | "sts_zone";
  radiusKm: number; // Detection radius — vessel within this = "at port"
}

export const WORLD_PORTS: Port[] = [
  // ── Oil Terminals ───────────────────────────────────────
  { id: "ras-tanura",     name: "Ras Tanura",           country: "Saudi Arabia", countryCode: "SA", lat: 26.644, lon: 50.162,  type: "oil_terminal", radiusKm: 5 },
  { id: "kharg-island",   name: "Kharg Island",         country: "Iran",         countryCode: "IR", lat: 29.233, lon: 50.312,  type: "oil_terminal", radiusKm: 5 },
  { id: "basra-abot",     name: "Al Basrah Oil Terminal",country: "Iraq",         countryCode: "IQ", lat: 29.680, lon: 48.810,  type: "oil_terminal", radiusKm: 5 },
  { id: "yanbu",          name: "Yanbu",                country: "Saudi Arabia", countryCode: "SA", lat: 24.089, lon: 38.063,  type: "oil_terminal", radiusKm: 5 },
  { id: "jebel-ali",      name: "Jebel Ali",            country: "UAE",          countryCode: "AE", lat: 24.980, lon: 55.060,  type: "oil_terminal", radiusKm: 8 },
  { id: "fujairah-port",  name: "Port of Fujairah",     country: "UAE",          countryCode: "AE", lat: 25.130, lon: 56.360,  type: "oil_terminal", radiusKm: 5 },
  { id: "rotterdam-euro", name: "Rotterdam / Europoort", country: "Netherlands", countryCode: "NL", lat: 51.955, lon: 4.130,   type: "oil_terminal", radiusKm: 10 },
  { id: "houston-ship",   name: "Houston Ship Channel",  country: "USA",         countryCode: "US", lat: 29.725, lon: -95.015, type: "oil_terminal", radiusKm: 10 },
  { id: "ningbo-zhoushan",name: "Ningbo-Zhoushan",       country: "China",       countryCode: "CN", lat: 29.940, lon: 122.100, type: "oil_terminal", radiusKm: 12 },
  { id: "jurong-island",  name: "Jurong Island",         country: "Singapore",   countryCode: "SG", lat: 1.265,  lon: 103.690, type: "oil_terminal", radiusKm: 5 },
  { id: "novorossiysk",   name: "Novorossiysk",          country: "Russia",      countryCode: "RU", lat: 44.700, lon: 37.790,  type: "oil_terminal", radiusKm: 5 },
  { id: "primorsk",       name: "Primorsk",              country: "Russia",      countryCode: "RU", lat: 60.358, lon: 28.647,  type: "oil_terminal", radiusKm: 5 },
  { id: "mina-al-ahmadi", name: "Mina Al Ahmadi",        country: "Kuwait",      countryCode: "KW", lat: 29.070, lon: 48.170,  type: "oil_terminal", radiusKm: 5 },

  // ── Container Ports ─────────────────────────────────────
  { id: "singapore",      name: "Singapore",             country: "Singapore",   countryCode: "SG", lat: 1.264,  lon: 103.830, type: "container",    radiusKm: 10 },
  { id: "shanghai",       name: "Shanghai / Yangshan",   country: "China",       countryCode: "CN", lat: 30.630, lon: 122.070, type: "container",    radiusKm: 12 },
  { id: "busan",          name: "Busan",                 country: "South Korea", countryCode: "KR", lat: 35.075, lon: 129.075, type: "container",    radiusKm: 8 },
  { id: "la-long-beach",  name: "LA / Long Beach",       country: "USA",         countryCode: "US", lat: 33.740, lon: -118.260,type: "container",    radiusKm: 10 },
  { id: "hamburg",        name: "Hamburg",                country: "Germany",     countryCode: "DE", lat: 53.545, lon: 9.940,   type: "container",    radiusKm: 8 },
  { id: "port-klang",     name: "Port Klang",              country: "Malaysia",    countryCode: "MY", lat: 2.999,  lon: 101.390, type: "container",    radiusKm: 8 },
  { id: "tanjung-pelepas",name: "Tanjung Pelepas",        country: "Malaysia",    countryCode: "MY", lat: 1.370,  lon: 103.540, type: "container",    radiusKm: 5 },
  { id: "felixstowe",     name: "Felixstowe",             country: "UK",          countryCode: "GB", lat: 51.955, lon: 1.310,   type: "container",    radiusKm: 5 },
  { id: "piraeus",        name: "Piraeus",                country: "Greece",      countryCode: "GR", lat: 37.940, lon: 23.640,  type: "container",    radiusKm: 5 },
  { id: "port-said",      name: "Port Said",              country: "Egypt",       countryCode: "EG", lat: 31.270, lon: 32.310,  type: "container",    radiusKm: 5 },

  // ── Naval Bases ─────────────────────────────────────────
  { id: "norfolk",        name: "NS Norfolk",             country: "USA",         countryCode: "US", lat: 36.950, lon: -76.310, type: "naval",        radiusKm: 8 },
  { id: "san-diego",      name: "NS San Diego",           country: "USA",         countryCode: "US", lat: 32.685, lon: -117.145,type: "naval",        radiusKm: 6 },
  { id: "yokosuka",       name: "Yokosuka",               country: "Japan",       countryCode: "JP", lat: 35.285, lon: 139.660, type: "naval",        radiusKm: 5 },
  { id: "changi-naval",   name: "Changi Naval Base",      country: "Singapore",   countryCode: "SG", lat: 1.330,  lon: 104.010, type: "naval",        radiusKm: 5 },
  { id: "bandar-abbas",   name: "Bandar Abbas",           country: "Iran",        countryCode: "IR", lat: 27.180, lon: 56.280,  type: "naval",        radiusKm: 6 },
  { id: "sevastopol-nav", name: "Sevastopol",             country: "Russia",      countryCode: "RU", lat: 44.618, lon: 33.523,  type: "naval",        radiusKm: 6 },
  { id: "tartus-nav",     name: "Tartus",                 country: "Syria",       countryCode: "SY", lat: 34.889, lon: 35.873,  type: "naval",        radiusKm: 4 },
  { id: "pearl-harbor",   name: "Pearl Harbor",           country: "USA",         countryCode: "US", lat: 21.350, lon: -157.970,type: "naval",        radiusKm: 6 },

  // ── Known STS Zones ─────────────────────────────────────
  { id: "sts-khor-fakkan",name: "Khor Fakkan STS",        country: "UAE",         countryCode: "AE", lat: 25.35,  lon: 56.35,   type: "sts_zone",     radiusKm: 10 },
  { id: "sts-fujairah",   name: "Fujairah STS Anchorage", country: "UAE",         countryCode: "AE", lat: 25.15,  lon: 56.38,   type: "sts_zone",     radiusKm: 12 },
  { id: "sts-kalamata",   name: "Kalamata STS",           country: "Greece",      countryCode: "GR", lat: 36.95,  lon: 22.10,   type: "sts_zone",     radiusKm: 15 },
  { id: "sts-ceuta",      name: "Ceuta STS",              country: "Spain",       countryCode: "ES", lat: 35.90,  lon: -5.30,   type: "sts_zone",     radiusKm: 10 },
  { id: "sts-lome",       name: "Lomé STS",               country: "Togo",        countryCode: "TG", lat: 6.13,   lon: 1.30,    type: "sts_zone",     radiusKm: 15 },
  { id: "sts-gulf-oman",  name: "Gulf of Oman STS",       country: "International",countryCode: "OM",lat: 25.00,  lon: 57.80,   type: "sts_zone",     radiusKm: 15 },
];

// ── Lookup Helpers ────────────────────────────────────────

const R_EARTH = 6371; // km

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest port to a lat/lon. Returns null if none within maxKm.
 */
export function findNearestPort(
  lat: number,
  lon: number,
  maxKm = 20
): (Port & { distanceKm: number }) | null {
  let best: (Port & { distanceKm: number }) | null = null;

  for (const port of WORLD_PORTS) {
    const dist = haversineKm(lat, lon, port.lat, port.lon);
    if (dist <= port.radiusKm && dist <= maxKm) {
      if (!best || dist < best.distanceKm) {
        best = { ...port, distanceKm: dist };
      }
    }
  }

  return best;
}

/**
 * Check if a position is within a known STS transfer zone.
 */
export function findStsZone(
  lat: number,
  lon: number
): Port | null {
  for (const port of WORLD_PORTS) {
    if (port.type !== "sts_zone") continue;
    const dist = haversineKm(lat, lon, port.lat, port.lon);
    if (dist <= port.radiusKm) return port;
  }
  return null;
}

/**
 * Distance between two points in nautical miles.
 */
export function distanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineKm(lat1, lon1, lat2, lon2) / 1.852;
}
