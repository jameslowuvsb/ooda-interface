import type { IntelAssessment, Recommendation, WatchPriority } from "@/lib/decide/analyst";

/**
 * ACT: Execute decisions and close the OODA loop
 *
 * Takes DECIDE output and:
 * 1. Generates formatted intelligence briefs
 * 2. Produces alert notifications (for even-terminal / smart glasses)
 * 3. Adjusts OBSERVE parameters (watch zones, polling rates, focus areas)
 * 4. Logs actions taken for audit trail
 *
 * This is what separates an OODA system from a dashboard:
 * the system ACTS on its analysis, then feeds adjustments
 * back into OBSERVE to start the next loop iteration.
 */

export interface ActionResult {
  id: string;
  timestamp: number;
  type: "brief" | "alert" | "observe_adjust" | "watchlist_update";
  status: "executed" | "pending" | "failed";
  description: string;
  details: string;
}

export interface OODALoopResult {
  loopId: string;
  timestamp: number;
  duration: number; // ms for full OODA cycle

  // Assessment from DECIDE
  threatLevel: string;
  confidence: number;

  // Actions taken
  actions: ActionResult[];

  // Intel brief (formatted for human consumption)
  brief: IntelBrief;

  // Feedback to OBSERVE (closes the loop)
  observeAdjustments: ObserveAdjustment[];

  // Next loop timing
  nextLoopMs: number;
}

export interface IntelBrief {
  classification: string;
  timestamp: string;
  threatLevel: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  watchAreas: string[];
  // AI-enhanced fields (optional — populated when GROQ is available)
  aiSummary?: string;
  aiStrategicContext?: string;
  aiPatterns?: string[];
  aiRiskAssessment?: string;
  aiInsights?: string[];
  aiConfidence?: number;
  aiModel?: string;
}

export interface ObserveAdjustment {
  parameter: string;
  previousValue: string;
  newValue: string;
  reason: string;
}

// Adaptive loop timing based on threat level
const LOOP_INTERVALS: Record<string, number> = {
  NORMAL: 120_000,    // 2 min — routine monitoring
  ELEVATED: 60_000,   // 1 min — increased vigilance
  HIGH: 30_000,       // 30s — active monitoring
  CRITICAL: 15_000,   // 15s — maximum tempo
};

// Track loop state for feedback
let currentPollingRate = 120_000;
let currentWatchZones: WatchPriority[] = [];
let loopCount = 0;

function formatBrief(assessment: IntelAssessment): IntelBrief {
  const now = new Date(assessment.timestamp);
  const dtg = now.toISOString().replace("T", " ").slice(0, 19) + "Z";

  return {
    classification: "UNCLASSIFIED // OSINT",
    timestamp: dtg,
    threatLevel: assessment.threatLevel,
    summary: assessment.situation,
    findings: assessment.keyFindings,
    recommendations: assessment.recommendations.map(
      (r) => `[${r.priority.toUpperCase()}] ${r.action}`
    ),
    watchAreas: assessment.watchPriorities.map(
      (w) => `${w.area} (${w.radiusKm}km radius, ${w.duration})`
    ),
  };
}

function generateAlerts(
  assessment: IntelAssessment
): ActionResult[] {
  const actions: ActionResult[] = [];
  let actionId = 0;

  // Immediate-priority recommendations become alerts
  const immediateRecs = assessment.recommendations.filter(
    (r) => r.priority === "immediate"
  );

  for (const rec of immediateRecs) {
    actions.push({
      id: `act-alert-${actionId++}`,
      timestamp: Date.now(),
      type: "alert",
      status: "executed",
      description: `ALERT: ${rec.action}`,
      details: rec.rationale,
    });
  }

  // Threat level changes generate alerts
  if (assessment.threatLevel !== "NORMAL") {
    actions.push({
      id: `act-threat-${actionId++}`,
      timestamp: Date.now(),
      type: "alert",
      status: "executed",
      description: `Threat level: ${assessment.threatLevel} (confidence: ${(assessment.confidence * 100).toFixed(0)}%)`,
      details: assessment.situation,
    });
  }

  return actions;
}

function computeObserveAdjustments(
  assessment: IntelAssessment
): ObserveAdjustment[] {
  const adjustments: ObserveAdjustment[] = [];

  // Adjust polling rate based on threat level
  const newPollingRate =
    LOOP_INTERVALS[assessment.threatLevel] || LOOP_INTERVALS.NORMAL;
  if (newPollingRate !== currentPollingRate) {
    adjustments.push({
      parameter: "polling_interval",
      previousValue: `${currentPollingRate / 1000}s`,
      newValue: `${newPollingRate / 1000}s`,
      reason: `Threat level ${assessment.threatLevel} requires ${assessment.threatLevel === "NORMAL" ? "standard" : "increased"} monitoring tempo.`,
    });
    currentPollingRate = newPollingRate;
  }

  // Adjust watch zones
  const newWatchZones = assessment.watchPriorities;
  if (
    JSON.stringify(newWatchZones.map((w) => w.id)) !==
    JSON.stringify(currentWatchZones.map((w) => w.id))
  ) {
    adjustments.push({
      parameter: "watch_zones",
      previousValue: `${currentWatchZones.length} zones`,
      newValue: `${newWatchZones.length} zones`,
      reason: `Updated watch priorities based on current threat assessment.`,
    });
    currentWatchZones = newWatchZones;
  }

  return adjustments;
}

/**
 * Execute the ACT phase: generate briefs, push alerts, adjust OBSERVE
 */
export function execute(assessment: IntelAssessment): OODALoopResult {
  const startTime = Date.now();
  loopCount++;

  // Generate formatted brief
  const brief = formatBrief(assessment);

  // Generate and "send" alerts
  const alertActions = generateAlerts(assessment);

  // Compute OBSERVE adjustments (closes the loop)
  const observeAdjustments = computeObserveAdjustments(assessment);

  // Brief generation action
  const briefAction: ActionResult = {
    id: `act-brief-${loopCount}-${Date.now()}`,
    timestamp: Date.now(),
    type: "brief",
    status: "executed",
    description: `Intel brief generated — ${assessment.threatLevel} threat level`,
    details: brief.summary,
  };

  // OBSERVE adjustment actions
  const adjustActions: ActionResult[] = observeAdjustments.map((adj, i) => ({
    id: `act-adjust-${loopCount}-${i}-${Date.now()}`,
    timestamp: Date.now(),
    type: "observe_adjust" as const,
    status: "executed" as const,
    description: `Adjusted ${adj.parameter}: ${adj.previousValue} → ${adj.newValue}`,
    details: adj.reason,
  }));

  const allActions = [briefAction, ...alertActions, ...adjustActions];

  const nextLoopMs =
    LOOP_INTERVALS[assessment.threatLevel] || LOOP_INTERVALS.NORMAL;

  return {
    loopId: `ooda-${loopCount}-${Date.now()}`,
    timestamp: Date.now(),
    duration: Date.now() - startTime,
    threatLevel: assessment.threatLevel,
    confidence: assessment.confidence,
    actions: allActions,
    brief,
    observeAdjustments,
    nextLoopMs,
  };
}
