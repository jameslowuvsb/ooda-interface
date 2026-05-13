/**
 * GROQ LLM-Powered Intelligence Analyst
 *
 * Enhances the rule-based DECIDE phase with natural language analysis.
 * Uses Groq's fast inference (llama3-70b) for real-time intelligence briefs.
 *
 * The LLM receives:
 * - Current vessel data summary
 * - ORIENT alerts (dark ship detections)
 * - Rule-based assessment results
 * - Weather conditions
 * - Recent news context
 *
 * And produces:
 * - Natural language intelligence brief
 * - Strategic context and implications
 * - Pattern analysis beyond what rules can detect
 */

import type { Vessel } from "@/types";
import type { DarkShipAlert } from "@/lib/orient/dark-ship-detector";
import type { IntelAssessment } from "@/lib/decide/analyst";

interface WeatherSummary {
  location: string;
  temp: number;
  windSpeed: number;
  condition: string;
  seaState: string;
  visibility: number;
}

interface AIBrief {
  summary: string;
  strategicContext: string;
  patterns: string[];
  riskAssessment: string;
  actionableInsights: string[];
  aiConfidence: number;
  modelUsed: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function buildSystemPrompt(): string {
  return `You are OODA-AI, a maritime intelligence analyst specializing in chokepoint security and sanctions enforcement. You provide concise, actionable intelligence briefs in military-style formatting.

Your role in the OODA loop:
- OBSERVE: Real-time AIS vessel tracking across 10 strategic maritime chokepoints
- ORIENT: Dark ship detection (AIS gaps, speed anomalies, STS zone activity)
- DECIDE: You analyze patterns and provide strategic context
- ACT: Your brief drives operational decisions

Rules:
- Be concise. Each section should be 1-3 sentences max.
- Use specific numbers, vessel names, and coordinates when available.
- Flag patterns that rule-based systems might miss (e.g., unusual flag-state concentrations, convoy-like behavior, seasonal anomalies).
- Always assess strategic implications for energy markets and regional stability.
- Classify threat level: NORMAL / ELEVATED / HIGH / CRITICAL with reasoning.
- Output ONLY valid JSON matching the schema provided.`;
}

function buildAnalysisPrompt(
  vessels: Vessel[],
  alerts: DarkShipAlert[],
  assessment: IntelAssessment,
  weather?: WeatherSummary[],
  newsContext?: string[]
): string {
  // Vessel summary by region
  const regionCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const anchoredCount = vessels.filter((v) => v.speed < 0.5).length;

  for (const v of vessels) {
    typeCounts[v.shipType] = (typeCounts[v.shipType] || 0) + 1;

    const lat = v.latitude;
    const lon = v.longitude;
    let region = "Other";
    if (lat >= 24 && lat <= 28 && lon >= 54 && lon <= 59) region = "Hormuz";
    else if (lat >= 11 && lat <= 14 && lon >= 42 && lon <= 46) region = "Bab-el-Mandeb";
    else if (lat >= 27 && lat <= 32 && lon >= 32 && lon <= 35) region = "Suez";
    else if (lat >= -2 && lat <= 4 && lon >= 99 && lon <= 105) region = "Malacca";
    else if (lat >= 7 && lat <= 16 && lon >= 110 && lon <= 118) region = "South China Sea";
    else if (lat >= 35 && lat <= 37 && lon >= -7 && lon <= -4) region = "Gibraltar";
    else if (lat >= 49.5 && lat <= 51.5 && lon >= -2 && lon <= 2) region = "English Channel";
    else if (lat >= 22.5 && lat <= 26 && lon >= 117 && lon <= 121) region = "Taiwan Strait";
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  }

  const regionSummary = Object.entries(regionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([r, c]) => `${r}: ${c}`)
    .join(", ");

  const typeSummary = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([t, c]) => `${t}: ${c}`)
    .join(", ");

  const alertSummary = alerts.length > 0
    ? alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.alertType}: ${a.vesselName} at ${a.latitude.toFixed(2)}N,${a.longitude.toFixed(2)}E — ${a.description}`).join("\n")
    : "No anomalies detected.";

  const weatherSummary = weather && weather.length > 0
    ? weather.map((w) => `${w.location}: ${w.temp}°C, ${w.condition}, wind ${w.windSpeed}m/s, sea ${w.seaState}, vis ${w.visibility}m`).join("\n")
    : "Weather data unavailable.";

  const newsSummary = newsContext && newsContext.length > 0
    ? newsContext.slice(0, 5).join("\n")
    : "No relevant news.";

  return `CURRENT INTELLIGENCE DATA:

VESSELS: ${vessels.length} total (${anchoredCount} anchored)
REGIONS: ${regionSummary}
TYPES: ${typeSummary}

ORIENT ALERTS:
${alertSummary}

RULE-BASED ASSESSMENT:
Threat Level: ${assessment.threatLevel}
Confidence: ${(assessment.confidence * 100).toFixed(0)}%
Situation: ${assessment.situation}

WEATHER CONDITIONS:
${weatherSummary}

NEWS CONTEXT:
${newsSummary}

Provide your intelligence assessment as JSON:
{
  "summary": "1-2 sentence executive summary of the current maritime picture",
  "strategicContext": "Brief analysis of strategic implications (energy security, geopolitical tensions, sanctions compliance)",
  "patterns": ["Array of 1-3 patterns or anomalies you observe beyond the rule-based detection"],
  "riskAssessment": "Overall risk assessment with specific triggers to watch",
  "actionableInsights": ["Array of 1-3 specific, actionable recommendations"],
  "aiConfidence": 0.0 to 1.0
}`;
}

/**
 * Run GROQ LLM analysis on the current intelligence picture.
 * Falls back gracefully if GROQ is unavailable.
 */
export async function analyzeWithAI(
  vessels: Vessel[],
  alerts: DarkShipAlert[],
  assessment: IntelAssessment,
  weather?: WeatherSummary[],
  newsContext?: string[]
): Promise<AIBrief | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: buildAnalysisPrompt(vessels, alerts, assessment, weather, newsContext),
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) {
      console.error("[GROQ] API error:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || assessment.situation,
      strategicContext: parsed.strategicContext || "",
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      riskAssessment: parsed.riskAssessment || "",
      actionableInsights: Array.isArray(parsed.actionableInsights) ? parsed.actionableInsights : [],
      aiConfidence: typeof parsed.aiConfidence === "number" ? parsed.aiConfidence : 0.5,
      modelUsed: data.model || "llama-3.3-70b-versatile",
    };
  } catch (err) {
    console.error("[GROQ] Analysis failed:", err);
    return null;
  }
}
