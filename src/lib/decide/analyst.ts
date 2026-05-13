import type { Vessel } from "@/types";
import type { DarkShipAlert } from "@/lib/orient/dark-ship-detector";

/**
 * DECIDE: Intelligence Analyst Engine
 *
 * Takes ORIENT output (alerts + context) and produces:
 * 1. Situational assessment — what's actually happening
 * 2. Threat classification — severity + confidence
 * 3. Recommended actions — specific steps to take
 * 4. Watch priorities — what to monitor next (feeds back to OBSERVE)
 *
 * This closes the OODA loop: the DECIDE phase doesn't just flag problems,
 * it tells you what to DO about them.
 */

export type ThreatLevel = "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";

export interface IntelAssessment {
  id: string;
  timestamp: number;
  threatLevel: ThreatLevel;
  confidence: number; // 0-1

  // Situational picture
  situation: string;
  keyFindings: string[];

  // Decisions / recommendations
  recommendations: Recommendation[];

  // Watch priorities — feeds back into OBSERVE
  watchPriorities: WatchPriority[];

  // Source data
  alertsAnalyzed: number;
  vesselsAnalyzed: number;
}

export interface Recommendation {
  id: string;
  priority: "immediate" | "high" | "routine";
  action: string;
  rationale: string;
  targetMmsi?: string;
  targetCoords?: { lat: number; lon: number };
}

export interface WatchPriority {
  id: string;
  area: string;
  reason: string;
  coordinates: { lat: number; lon: number };
  radiusKm: number;
  duration: string;
}

// Hormuz traffic flow baselines (typical daily patterns)
const BASELINES = {
  normalVesselCount: { min: 80, max: 150 },
  normalTankerRatio: 0.45, // ~45% of Hormuz traffic is tankers
  normalAnchoredRatio: 0.15, // ~15% anchored at any time
  stsAlertThreshold: 2, // > 2 STS alerts is unusual
  aisGapThreshold: 1, // any AIS gap is noteworthy
};

function assessThreatLevel(
  alerts: DarkShipAlert[],
  vessels: Vessel[]
): { level: ThreatLevel; confidence: number } {
  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const mediumAlerts = alerts.filter((a) => a.severity === "medium").length;
  const aisGaps = alerts.filter((a) => a.alertType === "ais_gap").length;
  const stsAlerts = alerts.filter((a) => a.alertType === "sts_zone").length;

  // Traffic volume analysis
  const vesselCount = vessels.length;
  const belowBaseline =
    vesselCount < BASELINES.normalVesselCount.min;
  const wayBelowBaseline =
    vesselCount < BASELINES.normalVesselCount.min * 0.5;

  // Tanker ratio (are tankers avoiding the strait?)
  const tankers = vessels.filter((v) => v.shipType === "Tanker").length;
  const tankerRatio = vesselCount > 0 ? tankers / vesselCount : 0;
  const tankerAvoidance = tankerRatio < BASELINES.normalTankerRatio * 0.5;

  // Scoring
  let score = 0;
  score += highAlerts * 3;
  score += mediumAlerts * 1;
  score += aisGaps * 4; // AIS gaps are very significant
  score += stsAlerts > BASELINES.stsAlertThreshold ? 2 : 0;
  score += belowBaseline ? 3 : 0;
  score += wayBelowBaseline ? 5 : 0;
  score += tankerAvoidance ? 4 : 0;

  let level: ThreatLevel = "NORMAL";
  let confidence = 0.5;

  if (score >= 12) {
    level = "CRITICAL";
    confidence = Math.min(0.95, 0.7 + score * 0.02);
  } else if (score >= 7) {
    level = "HIGH";
    confidence = Math.min(0.9, 0.6 + score * 0.03);
  } else if (score >= 3) {
    level = "ELEVATED";
    confidence = Math.min(0.85, 0.5 + score * 0.05);
  } else {
    confidence = Math.max(0.3, 0.7 - alerts.length * 0.05);
  }

  return { level, confidence };
}

function generateSituation(
  vessels: Vessel[],
  alerts: DarkShipAlert[],
  threatLevel: ThreatLevel
): string {
  const tankers = vessels.filter((v) => v.shipType === "Tanker").length;
  const cargo = vessels.filter((v) => v.shipType === "Cargo").length;
  const anchored = vessels.filter((v) => v.speed < 0.5).length;
  const moving = vessels.length - anchored;

  const situations: string[] = [];
  situations.push(
    `${vessels.length} vessels tracked in Strait of Hormuz AOR (${tankers} tankers, ${cargo} cargo, ${anchored} anchored, ${moving} in transit).`
  );

  if (alerts.length > 0) {
    situations.push(
      `${alerts.length} anomalies detected: ${alerts.filter((a) => a.alertType === "ais_gap").length} AIS gaps, ${alerts.filter((a) => a.alertType === "sts_zone").length} STS zone alerts, ${alerts.filter((a) => a.alertType === "speed_anomaly").length} speed anomalies.`
    );
  }

  if (threatLevel === "CRITICAL" || threatLevel === "HIGH") {
    if (vessels.length < BASELINES.normalVesselCount.min) {
      situations.push(
        `Traffic volume ${vessels.length} is BELOW baseline (${BASELINES.normalVesselCount.min}-${BASELINES.normalVesselCount.max}). Possible transit disruption or avoidance behavior.`
      );
    }
  }

  return situations.join(" ");
}

function generateRecommendations(
  alerts: DarkShipAlert[],
  vessels: Vessel[],
  threatLevel: ThreatLevel
): Recommendation[] {
  const recs: Recommendation[] = [];
  let recId = 0;

  // AIS gap recommendations
  const aisGaps = alerts.filter((a) => a.alertType === "ais_gap");
  for (const gap of aisGaps) {
    recs.push({
      id: `rec-${recId++}`,
      priority: "immediate",
      action: `Investigate AIS gap for ${gap.vesselName}. Cross-reference with satellite imagery at last known position.`,
      rationale: `Vessel went dark near ${gap.latitude.toFixed(2)}°N ${gap.longitude.toFixed(2)}°E — possible sanctions evasion, transponder tampering, or distress.`,
      targetMmsi: gap.vesselMmsi,
      targetCoords: { lat: gap.latitude, lon: gap.longitude },
    });
  }

  // STS zone recommendations
  const stsAlerts = alerts.filter((a) => a.alertType === "sts_zone");
  if (stsAlerts.length >= 2) {
    recs.push({
      id: `rec-${recId++}`,
      priority: "high",
      action: `Monitor ship-to-ship transfer zone. ${stsAlerts.length} tankers currently in known STS areas. Request satellite tasking for visual confirmation.`,
      rationale: `Multiple tankers anchored in known STS zones suggests possible illicit oil transfers. Common sanctions evasion pattern.`,
      targetCoords: { lat: stsAlerts[0].latitude, lon: stsAlerts[0].longitude },
    });
  }

  // Speed anomaly recommendations
  const speedAlerts = alerts.filter((a) => a.alertType === "speed_anomaly");
  for (const sa of speedAlerts) {
    recs.push({
      id: `rec-${recId++}`,
      priority: "high",
      action: `Flag ${sa.vesselName} for AIS spoofing investigation. Position data inconsistent with reported speed.`,
      rationale: sa.description,
      targetMmsi: sa.vesselMmsi,
      targetCoords: { lat: sa.latitude, lon: sa.longitude },
    });
  }

  // Traffic volume recommendations
  if (vessels.length < BASELINES.normalVesselCount.min) {
    recs.push({
      id: `rec-${recId++}`,
      priority: threatLevel === "CRITICAL" ? "immediate" : "high",
      action: `Assess cause of reduced Hormuz transit volume. Check for NOTAM/NAVAREA warnings, military activity, or insurance market signals.`,
      rationale: `Only ${vessels.length} vessels detected vs baseline ${BASELINES.normalVesselCount.min}-${BASELINES.normalVesselCount.max}. Reduced traffic may indicate elevated risk perception among operators.`,
    });
  }

  // Routine recommendations always present
  recs.push({
    id: `rec-${recId++}`,
    priority: "routine",
    action: `Continue OBSERVE cycle. Next assessment in 30 minutes. Adjust OBSERVE parameters if threat level changes.`,
    rationale: `Standard OODA loop maintenance. Current threat level: ${threatLevel}.`,
  });

  return recs;
}

function generateWatchPriorities(
  alerts: DarkShipAlert[],
  threatLevel: ThreatLevel
): WatchPriority[] {
  const priorities: WatchPriority[] = [];
  let wpId = 0;

  // Always watch the strait itself
  priorities.push({
    id: `wp-${wpId++}`,
    area: "Strait of Hormuz — traffic separation zone",
    reason: "Primary chokepoint. Monitor inbound/outbound vessel flow rates.",
    coordinates: { lat: 26.3, lon: 56.4 },
    radiusKm: 50,
    duration: "continuous",
  });

  // Add watch zones around active alerts
  const alertAreas = new Map<string, DarkShipAlert>();
  for (const alert of alerts) {
    const key = `${Math.round(alert.latitude * 10)}:${Math.round(alert.longitude * 10)}`;
    if (!alertAreas.has(key)) {
      alertAreas.set(key, alert);
    }
  }

  for (const alert of alertAreas.values()) {
    priorities.push({
      id: `wp-${wpId++}`,
      area: `Alert zone — ${alert.alertType.replace("_", " ")}`,
      reason: alert.description,
      coordinates: { lat: alert.latitude, lon: alert.longitude },
      radiusKm: 25,
      duration: alert.severity === "high" ? "4h" : "1h",
    });
  }

  // If elevated, add STS zones to watch list
  if (threatLevel !== "NORMAL") {
    priorities.push({
      id: `wp-${wpId++}`,
      area: "Fujairah anchorage — STS transfer zone",
      reason: "Known STS transfer area. Elevated monitoring during heightened threat.",
      coordinates: { lat: 25.15, lon: 56.38 },
      radiusKm: 15,
      duration: "until downgrade",
    });
  }

  return priorities;
}

/**
 * Run the DECIDE phase: analyze ORIENT output and produce actionable intelligence
 */
export function analyze(
  vessels: Vessel[],
  alerts: DarkShipAlert[]
): IntelAssessment {
  const { level, confidence } = assessThreatLevel(alerts, vessels);
  const situation = generateSituation(vessels, alerts, level);
  const recommendations = generateRecommendations(alerts, vessels, level);
  const watchPriorities = generateWatchPriorities(alerts, level);

  // Key findings — top-level bullet points
  const keyFindings: string[] = [];
  if (alerts.length === 0) {
    keyFindings.push("No anomalies detected. Normal traffic patterns.");
  }
  if (alerts.filter((a) => a.alertType === "ais_gap").length > 0) {
    keyFindings.push(
      `${alerts.filter((a) => a.alertType === "ais_gap").length} vessel(s) went dark — AIS transponder disabled or lost.`
    );
  }
  if (alerts.filter((a) => a.alertType === "sts_zone").length > 0) {
    keyFindings.push(
      `Tanker activity in known STS transfer zones — possible illicit oil transfers.`
    );
  }
  if (vessels.length < BASELINES.normalVesselCount.min) {
    keyFindings.push(
      `Below-baseline traffic volume (${vessels.length} vs ${BASELINES.normalVesselCount.min}+ expected).`
    );
  }
  const immediateActions = recommendations.filter(
    (r) => r.priority === "immediate"
  );
  if (immediateActions.length > 0) {
    keyFindings.push(
      `${immediateActions.length} IMMEDIATE action(s) recommended.`
    );
  }

  return {
    id: `assessment-${Date.now()}`,
    timestamp: Date.now(),
    threatLevel: level,
    confidence,
    situation,
    keyFindings,
    recommendations,
    watchPriorities,
    alertsAnalyzed: alerts.length,
    vesselsAnalyzed: vessels.length,
  };
}
