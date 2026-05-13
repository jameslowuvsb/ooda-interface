import { NextRequest, NextResponse } from "next/server";
import { initAISStream, getTrackedVessels } from "@/lib/aisstream-client";
import { ingestBatch, getTrack, getAllTracks, getFusionStats } from "@/lib/maritime/fusion-engine";

/**
 * Maritime Fusion API
 *
 * Multi-source fused vessel intelligence.
 *
 * Query params:
 * - ?mmsi=XXXXXXXXX — Get detailed fused track for a specific vessel
 * - ?summary=true   — Get all tracked vessels with risk/port-call summaries
 * - ?stats=true     — Get fusion engine statistics
 *
 * Each request also triggers an ingest cycle to keep the fusion engine current.
 */

export async function GET(req: NextRequest) {
  try {
    // Ensure AIS connection and ingest latest data
    await initAISStream();
    const vessels = getTrackedVessels();
    ingestBatch(vessels);

    const { searchParams } = req.nextUrl;

    // Stats mode
    if (searchParams.get("stats") === "true") {
      return NextResponse.json(getFusionStats(), {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=10" },
      });
    }

    // Single vessel track
    const mmsi = searchParams.get("mmsi");
    if (mmsi) {
      const track = getTrack(mmsi);
      if (!track) {
        return NextResponse.json(
          { error: "Vessel not found in fusion engine", mmsi },
          { status: 404 }
        );
      }
      return NextResponse.json(track, {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=10" },
      });
    }

    // Summary mode — all vessels
    if (searchParams.get("summary") === "true") {
      const tracks = getAllTracks();
      // Sort by risk score descending
      tracks.sort((a, b) => b.risk.score - a.risk.score);
      return NextResponse.json(
        { count: tracks.length, vessels: tracks },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=10" } }
      );
    }

    // Default: return stats + high-risk vessels
    const stats = getFusionStats();
    const tracks = getAllTracks()
      .filter((t) => t.risk.score > 20)
      .sort((a, b) => b.risk.score - a.risk.score)
      .slice(0, 20);

    return NextResponse.json(
      { stats, highRiskVessels: tracks },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=10" } }
    );
  } catch (error) {
    console.error("Maritime fusion API error:", error);
    return NextResponse.json(
      { error: "Fusion engine error" },
      { status: 500 }
    );
  }
}
