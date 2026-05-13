import { NextResponse } from "next/server";
import { fetchWeatherData } from "@/lib/weather";

/**
 * OBSERVE: Weather data for strategic chokepoints
 * Uses OpenWeatherMap API (free tier: 60 calls/min, 1M calls/month)
 *
 * Core logic lives in @/lib/weather — shared with /api/act OODA loop.
 */

export async function GET() {
  try {
    const results = await fetchWeatherData();

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json([]);
  }
}
