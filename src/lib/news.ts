/**
 * News & GDELT geopolitical events fetcher.
 * Uses GDELT GEO API (free, no key needed) + RSS feeds.
 *
 * Shared module used by both /api/news route and /api/act OODA loop.
 */

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  latitude: number;
  longitude: number;
  date: string;
  tone: number;
  imageUrl?: string;
}

/** Simple string hash -> 32-bit integer (djb2). */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned
}

/** Deterministic float in [-0.5, 0.5) derived from a hash seed. */
function deterministicJitter(seed: string, salt: number): number {
  const h = hashStr(seed + String(salt));
  return (h / 0xffffffff) - 0.5;
}

// GDELT GEO API — geocoded news events, no auth required
// NOTE: GDELT HTTPS fails from Node.js (TLS cert mismatch) — must use HTTP
const GDELT_GEO_URL = "http://api.gdeltproject.org/api/v2/geo/geo";

async function fetchGDELT(): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({
      query: "strait hormuz OR persian gulf OR iran oil OR tanker",
      mode: "PointData",
      format: "GeoJSON",
      timespan: "1440", // last 24 hours
      maxpoints: "50",
    });

    const res = await fetch(`${GDELT_GEO_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const features = data.features || [];

    return features.map(
      (f: {
        properties: Record<string, unknown>;
        geometry: { coordinates: number[] };
      }, i: number) => ({
        id: `gdelt-${hashStr(String(f.properties.url || '') + String(f.properties.name || '') + String(i)).toString(36)}`,
        title: String(f.properties.name || f.properties.html || "Unknown"),
        url: String(f.properties.url || f.properties.shareimage || ""),
        source: "GDELT",
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        date: String(f.properties.date || new Date().toISOString()),
        tone: Number(f.properties.tone) || 0,
        imageUrl: String(f.properties.shareimage || ""),
      })
    );
  } catch (e) {
    console.error("GDELT fetch error:", e);
    return [];
  }
}

// RSS feeds — major Middle East / maritime news
const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    source: "BBC Middle East",
    defaultLat: 29.0,
    defaultLon: 48.0,
  },
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    source: "Al Jazeera",
    defaultLat: 25.3,
    defaultLon: 51.5,
  },
];

async function fetchSingleFeed(feed: typeof RSS_FEEDS[number]): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  const res = await fetch(feed.url, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];

  const text = await res.text();
  // Simple XML parsing for RSS items
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (let i = 0; i < Math.min(items.length, 10); i++) {
    const item = items[i];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ||
                  item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    // Only include if title mentions relevant keywords
    const relevant = /hormuz|iran|gulf|tanker|oil|ship|naval|military|strait|maritime|sanction/i.test(title);
    if (!relevant) continue;

    // Extract image from media:content, media:thumbnail, or enclosure
    const mediaUrl = item.match(/<media:content[^>]+url="([^"]+)"/)?.[1] ||
                     item.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ||
                     item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ||
                     item.match(/<image>[^<]*<url>([^<]+)<\/url>/)?.[1] || "";

    const cleanTitle = title.replace(/<[^>]*>/g, "").trim();
    const seed = link || cleanTitle;

    articles.push({
      id: `rss-${hashStr(feed.source + seed).toString(36)}`,
      title: cleanTitle,
      url: link,
      source: feed.source,
      latitude: feed.defaultLat + deterministicJitter(seed, 0) * 2,
      longitude: feed.defaultLon + deterministicJitter(seed, 1) * 2,
      date: pubDate || new Date().toISOString(),
      tone: 0,
      imageUrl: mediaUrl,
    });
  }

  return articles;
}

async function fetchRSS(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) =>
      fetchSingleFeed(feed).catch((e) => {
        console.error(`RSS fetch error (${feed.source}):`, e);
        return [] as NewsArticle[];
      })
    )
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

/**
 * Fetch all news articles from GDELT and RSS feeds.
 * Runs both sources in parallel and merges results.
 * Returns an empty array on total failure.
 */
export async function fetchNewsData(): Promise<NewsArticle[]> {
  try {
    const [gdeltArticles, rssArticles] = await Promise.allSettled([
      fetchGDELT(),
      fetchRSS(),
    ]);

    return [
      ...(gdeltArticles.status === "fulfilled" ? gdeltArticles.value : []),
      ...(rssArticles.status === "fulfilled" ? rssArticles.value : []),
    ];
  } catch (error) {
    console.error("News fetch error:", error);
    return [];
  }
}
