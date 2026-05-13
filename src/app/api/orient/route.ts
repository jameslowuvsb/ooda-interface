import { NextResponse } from "next/server";
import { detectDarkShips } from "@/lib/orient/dark-ship-detector";
import { initAISStream, getTrackedVessels } from "@/lib/aisstream-client";
import { ingestBatch, getFusionStats } from "@/lib/maritime/fusion-engine";

/**
 * ORIENT: Dark Ship Detection & Anomaly Analysis
 *
 * Combines the legacy dark-ship detector with the fusion engine.
 * The fusion engine provides richer context (port calls, track confidence)
 * while the detector generates display-ready alerts for the AlertLayer.
 */

export async function GET() {
  try {
    await initAISStream();
    const vessels = getTrackedVessels();

    // Feed vessels into fusion engine (builds track history, port calls, risk)
    ingestBatch(vessels);

    // Run ORIENT phase: dark ship detection + anomaly analysis
    const alerts = detectDarkShips(vessels);

    // Include fusion stats for enhanced situational awareness
    const fusionStats = getFusionStats();

    return NextResponse.json(
      {
        timestamp: Date.now(),
        vesselCount: vessels.length,
        alertCount: alerts.length,
        alerts,
        summary: {
          aisGaps: alerts.filter((a) => a.alertType === "ais_gap").length,
          speedAnomalies: alerts.filter((a) => a.alertType === "speed_anomaly").length,
          stsZoneAlerts: alerts.filter((a) => a.alertType === "sts_zone").length,
          headingMismatches: alerts.filter((a) => a.alertType === "heading_mismatch").length,
        },
        fusion: fusionStats,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("Orient API error:", error);
    return NextResponse.json(
      { timestamp: Date.now(), vesselCount: 0, alertCount: 0, alerts: [], summary: {}, fusion: null },
      { status: 200 }
    );
  }
}
