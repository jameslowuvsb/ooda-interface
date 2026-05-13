import { NextResponse } from "next/server";
import { analyze } from "@/lib/decide/analyst";
import { detectDarkShips } from "@/lib/orient/dark-ship-detector";
import type { Vessel } from "@/types";

/**
 * DECIDE API: Full OODA loop up to decision point
 *
 * 1. Fetches vessel data (OBSERVE)
 * 2. Runs anomaly detection (ORIENT)
 * 3. Produces intelligence assessment with recommendations (DECIDE)
 *
 * Returns actionable intelligence that the ACT phase can execute on.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // OBSERVE: get current vessel data
    const vesselRes = await fetch(`${baseUrl}/api/vessels`);
    const vessels: Vessel[] = vesselRes.ok ? await vesselRes.json() : [];

    // ORIENT: detect anomalies
    const alerts = detectDarkShips(vessels);

    // DECIDE: analyze and recommend
    const assessment = analyze(vessels, alerts);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Decide API error:", error);
    return NextResponse.json(
      {
        id: `error-${Date.now()}`,
        timestamp: Date.now(),
        threatLevel: "NORMAL",
        confidence: 0,
        situation: "Assessment unavailable — data pipeline error.",
        keyFindings: ["System error during analysis."],
        recommendations: [],
        watchPriorities: [],
        alertsAnalyzed: 0,
        vesselsAnalyzed: 0,
      },
      { status: 200 }
    );
  }
}
