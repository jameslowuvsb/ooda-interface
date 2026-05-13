import { NextResponse } from "next/server";

/**
 * Satellite Image API — fetches profile images from Wikipedia.
 *
 * Uses the Wikipedia REST API (page/summary) to find the main image
 * and a short description for any satellite.
 *
 * Results are cached in-memory indefinitely (satellite images never change).
 *
 * Usage: GET /api/satellites/image?name=ISS%20(ZARYA)&id=25544
 */

interface SatelliteImageResult {
  imageUrl: string | null;
  description: string | null;
  wikiTitle: string | null;
  wikiUrl: string | null;
}

// Permanent in-memory cache — satellite images don't change
const imageCache = new Map<string, SatelliteImageResult>();

/**
 * Map CelesTrak satellite names to Wikipedia article titles.
 * CelesTrak names are often abbreviated or use different conventions.
 */
const KNOWN_MAPPINGS: Record<string, string> = {
  // NORAD ID → Wikipedia title
  "25544": "International_Space_Station",
  "48274": "Tianhe_(space_station_module)",
  "53239": "Wentian",
  "54216": "Mengtian",
  "36086": "Poisk_(ISS_module)",
  "49044": "Nauka_(ISS_module)",
};

// Name pattern → Wikipedia title
const NAME_MAPPINGS: Record<string, string> = {
  "ISS": "International_Space_Station",
  "ISS (ZARYA)": "International_Space_Station",
  "ISS (NAUKA)": "International_Space_Station",
  "CSS (TIANHE)": "Tianhe_(space_station_module)",
  "CSS (WENTIAN)": "Wentian",
  "CSS (MENGTIAN)": "Mengtian",
  "TIANGONG": "Tiangong_space_station",
  "HUBBLE": "Hubble_Space_Telescope",
  "POISK": "Poisk_(ISS_module)",
  "SOYUZ": "Soyuz_(spacecraft)",
  "CREW DRAGON": "SpaceX_Dragon_2",
  "CYGNUS": "Cygnus_(spacecraft)",
  "PROGRESS": "Progress_(spacecraft)",
  "STARLINER": "Boeing_Starliner",
  "HTV": "H-II_Transfer_Vehicle",
  "STARLINK": "Starlink",
  "COSMOS": "Cosmos_(satellite)",
  "FENGYUN": "Fengyun",
  "NOAA": "NOAA_(satellite)",
  "LANDSAT": "Landsat_program",
  "TERRA": "Terra_(satellite)",
  "AQUA": "Aqua_(satellite)",
  "GOES": "Geostationary_Operational_Environmental_Satellite",
};

function buildSearchTitle(name: string, id: string): string {
  // Check exact ID mapping first
  if (KNOWN_MAPPINGS[id]) return KNOWN_MAPPINGS[id];

  // Check exact name mapping
  if (NAME_MAPPINGS[name]) return NAME_MAPPINGS[name];

  // Check partial name matches
  const upper = name.toUpperCase();
  for (const [pattern, title] of Object.entries(NAME_MAPPINGS)) {
    if (upper.includes(pattern)) return title;
  }

  // Clean up name for Wikipedia search:
  // "ISS (ZARYA)" → "ZARYA", "CSS (TIANHE)" → "TIANHE"
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].trim();

  // Strip common suffixes
  return name
    .replace(/\s+(DEB|R\/B|DEBRIS)$/i, "")
    .replace(/\s+/g, "_")
    .trim();
}

async function fetchFromWikipedia(
  searchTitle: string
): Promise<SatelliteImageResult> {
  // Try the direct page summary first
  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle)}`;
    const res = await fetch(summaryUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source || data.extract) {
        return {
          imageUrl: data.thumbnail?.source || null,
          description: data.extract || null,
          wikiTitle: data.title || null,
          wikiUrl: data.content_urls?.desktop?.page || null,
        };
      }
    }
  } catch {
    // Fall through to search
  }

  // Fallback: use Wikipedia search API
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      searchTitle.replace(/_/g, " ") + " satellite spacecraft"
    )}&srnamespace=0&srlimit=1&format=json&origin=*`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const firstResult = searchData?.query?.search?.[0];
      if (firstResult?.title) {
        // Now fetch the summary for the found page
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`;
        const summaryRes = await fetch(summaryUrl, {
          signal: AbortSignal.timeout(5000),
        });

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          return {
            imageUrl: data.thumbnail?.source || null,
            description: data.extract || null,
            wikiTitle: data.title || null,
            wikiUrl: data.content_urls?.desktop?.page || null,
          };
        }
      }
    }
  } catch {
    // Silent fail
  }

  return { imageUrl: null, description: null, wikiTitle: null, wikiUrl: null };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "";
  const id = url.searchParams.get("id") || "";

  if (!name && !id) {
    return NextResponse.json(
      { imageUrl: null, description: null, wikiTitle: null, wikiUrl: null },
      { status: 400 }
    );
  }

  const cacheKey = `${id}:${name}`;

  // Check cache
  if (imageCache.has(cacheKey)) {
    return NextResponse.json(imageCache.get(cacheKey)!, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Cache": "HIT",
      },
    });
  }

  const searchTitle = buildSearchTitle(name, id);
  const result = await fetchFromWikipedia(searchTitle);

  // Cache the result (even if null — don't re-query failed lookups)
  imageCache.set(cacheKey, result);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Cache": "MISS",
    },
  });
}
