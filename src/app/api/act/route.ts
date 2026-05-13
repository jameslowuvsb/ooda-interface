import { NextResponse } from "next/server";
import { analyze } from "@/lib/decide/analyst";
import { execute } from "@/lib/act/executor";
import { detectDarkShips } from "@/lib/orient/dark-ship-detector";
import { analyzeWithAI } from "@/lib/ai/groq-analyst";
import { pushOODAAlertToGlasses } from "@/lib/act/glasses-push";
import { initAISStream, getTrackedVessels } from "@/lib/aisstream-client";
import { fetchWeatherData } from "@/lib/weather";
import { fetchNewsData } from "@/lib/news";
import type { Vessel } from "@/types";

/**
 * ACT API: Full OODA loop execution with AI enhancement
 *
 * Runs the complete cycle:
 * OBSERVE → ORIENT → DECIDE (rule-based + AI) → ACT
 *
 * Returns:
 * - Intelligence brief (with optional AI-enhanced analysis)
 * - Actions taken
 * - Feedback to OBSERVE
 * - Next loop timing
 */
export async function GET() {
  try {
    // ─── OBSERVE ─────────────────────────────────────
    // Fetch vessels, weather, and news in parallel (direct calls, no internal HTTP)
    const [, weatherResult, newsResult] = await Promise.allSettled([
      initAISStream(),
      fetchWeatherData(),
      fetchNewsData(),
    ]);

    const vessels: Vessel[] = getTrackedVessels();

    const weather =
      weatherResult.status === "fulfilled" ? weatherResult.value : [];

    const news =
      newsResult.status === "fulfilled" ? newsResult.value : [];

    // ─── ORIENT ─────────────────────────────────────
    const alerts = detectDarkShips(vessels);

    // ─── DECIDE (rule-based) ─────────────────────────
    const assessment = analyze(vessels, alerts);

    // ─── DECIDE (AI-enhanced, non-blocking) ──────────
    // Run AI analysis in parallel with execution — don't slow down the loop
    const aiPromise = analyzeWithAI(
      vessels,
      alerts,
      assessment,
      weather.map((w) => ({
        location: w.location,
        temp: w.temp,
        windSpeed: w.windSpeed,
        condition: w.condition,
        seaState: w.seaState || "",
        visibility: w.visibility,
      })),
      news.map((n: { title: string }) => n.title).slice(0, 5)
    );

    // ─── ACT ─────────────────────────────────────────
    const loopResult = execute(assessment);

    // Wait for AI analysis (with timeout handled internally)
    const aiBrief = await aiPromise;

    // Merge AI insights into the loop result if available
    if (aiBrief) {
      loopResult.brief.aiSummary = aiBrief.summary;
      loopResult.brief.aiStrategicContext = aiBrief.strategicContext;
      loopResult.brief.aiPatterns = aiBrief.patterns;
      loopResult.brief.aiRiskAssessment = aiBrief.riskAssessment;
      loopResult.brief.aiInsights = aiBrief.actionableInsights;
      loopResult.brief.aiConfidence = aiBrief.aiConfidence;
      loopResult.brief.aiModel = aiBrief.modelUsed;
    }

    // Push critical alerts to smart glasses (non-blocking)
    pushOODAAlertToGlasses(
      assessment.threatLevel,
      aiBrief?.summary || assessment.situation,
      aiBrief?.actionableInsights || assessment.keyFindings
    ).catch(() => {}); // fire-and-forget

    return NextResponse.json(loopResult);
  } catch (error) {
    console.error("ACT API error:", error);
    return NextResponse.json(
      {
        loopId: `error-${Date.now()}`,
        timestamp: Date.now(),
        duration: 0,
        threatLevel: "NORMAL",
        confidence: 0,
        actions: [],
        brief: {
          classification: "UNCLASSIFIED // OSINT",
          timestamp: new Date().toISOString(),
          threatLevel: "NORMAL",
          summary: "OODA loop error — pipeline failure.",
          findings: [],
          recommendations: [],
          watchAreas: [],
        },
        observeAdjustments: [],
        nextLoopMs: 120000,
      },
      { status: 200 }
    );
  }
}
