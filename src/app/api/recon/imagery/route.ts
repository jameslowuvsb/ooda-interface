import { NextRequest, NextResponse } from "next/server";

/**
 * Satellite Imagery Proxy — Fetches recent satellite imagery from NASA GIBS
 *
 * Uses NASA's Global Imagery Browse Services (GIBS) WMS endpoint.
 * Completely free, no API key required.
 *
 * Layers:
 * - VIIRS_SNPP_CorrectedReflectance_TrueColor (250m, daily)
 * - MODIS_Terra_CorrectedReflectance_TrueColor (250m, daily, fallback)
 *
 * The API returns a JPEG satellite image for the given bounding box.
 */

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

// In-memory cache: key → { buffer, timestamp }
const imageCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours — imagery updates daily

function getRecentDate(): string {
  // GIBS imagery is typically 1-2 days behind real-time
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().slice(0, 10);
}

function buildGibsUrl(
  lat: number,
  lon: number,
  span: number,
  layer: string,
  date: string,
  width: number,
  height: number
): string {
  const south = lat - span;
  const north = lat + span;
  const west = lon - span * 1.5; // wider to account for aspect ratio
  const east = lon + span * 1.5;

  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: `${layer},Coastlines_15m`,
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: "image/jpeg",
    TIME: date,
  });

  return `${GIBS_WMS}?${params.toString()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lon = parseFloat(searchParams.get("lon") || "0");
  const span = parseFloat(searchParams.get("span") || "0.3");
  const width = parseInt(searchParams.get("w") || "600");
  const height = parseInt(searchParams.get("h") || "400");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const date = getRecentDate();
  const cacheKey = `${lat.toFixed(3)}-${lon.toFixed(3)}-${span}-${date}`;

  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
        "X-Cache": "HIT",
        "X-Imagery-Date": date,
        "X-Imagery-Source": "NASA GIBS",
      },
    });
  }

  // Try VIIRS first, then MODIS as fallback
  const layers = [
    "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    "MODIS_Terra_CorrectedReflectance_TrueColor",
  ];

  for (const layer of layers) {
    try {
      const url = buildGibsUrl(lat, lon, span, layer, date, width, height);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image")) continue;

      const buffer = await res.arrayBuffer();

      // Cache the result
      imageCache.set(cacheKey, { buffer, timestamp: Date.now() });

      // Evict old entries
      if (imageCache.size > 100) {
        const oldest = [...imageCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, 20);
        for (const [key] of oldest) imageCache.delete(key);
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
          "X-Cache": "MISS",
          "X-Imagery-Date": date,
          "X-Imagery-Source": `NASA GIBS / ${layer.split("_")[0]}`,
        },
      });
    } catch {
      continue;
    }
  }

  // All sources failed — return a placeholder
  return NextResponse.json(
    { error: "Imagery unavailable", date },
    { status: 502 }
  );
}
