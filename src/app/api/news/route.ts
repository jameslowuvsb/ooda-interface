import { NextResponse } from "next/server";
import { fetchNewsData } from "@/lib/news";

/**
 * OBSERVE: News & GDELT geopolitical events layer
 * Uses GDELT GEO API (free, no key needed) + RSS feeds
 *
 * Core logic lives in @/lib/news — shared with /api/act OODA loop.
 */

export async function GET() {
  try {
    const articles = await fetchNewsData();

    return NextResponse.json(articles, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  }
}
