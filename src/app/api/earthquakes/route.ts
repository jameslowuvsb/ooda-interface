import { NextResponse } from "next/server";
import type { Earthquake } from "@/types";

// USGS GeoJSON feed — no API key needed
const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

export async function GET() {
  try {
    const res = await fetch(USGS_URL, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const features = data.features || [];

    const earthquakes: Earthquake[] = features.map(
      (f: {
        id: string;
        properties: Record<string, unknown>;
        geometry: { coordinates: number[] };
      }) => ({
        id: f.id,
        magnitude: (f.properties.mag as number) || 0,
        place: (f.properties.place as string) || "Unknown",
        time: f.properties.time as number,
        longitude: f.geometry.coordinates[0],
        latitude: f.geometry.coordinates[1],
        depth: f.geometry.coordinates[2] || 0,
        tsunami: (f.properties.tsunami as number) === 1,
        alert: (f.properties.alert as string) || null,
        felt: (f.properties.felt as number) || null,
      })
    );

    return NextResponse.json(earthquakes, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Earthquake API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
