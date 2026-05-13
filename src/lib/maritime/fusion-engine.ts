/**
 * Maritime Fusion Engine
 *
 * Multi-source intelligence fusion for vessel tracking.
 * Combines AIS, port proximity, movement history, gap analysis,
 * and risk scoring into a single enriched vessel profile.
 *
 * Architecture:
 * - Singleton via globalThis (survives Turbopack hot reloads)
 * - Ingests positions from AIS WebSocket cache
 * - Maintains per-vessel sliding window of TrackPoints
 * - Detects port calls, dark periods, speed anomalies
 * - Produces FusedVesselTrack on demand
 *
 * Feed cycle: /api/vessels calls ingestBatch() with latest AIS data.
 * Read cycle: /api/maritime/track?mmsi=X calls getTrack(mmsi).
 */

import type { Vessel } from "@/types";
import type {
  TrackPoint,
  PortCall,
  DarkPeriod,
  RiskFactor,
  VesselRisk,
  FusedVesselTrack,
  FusionStats,
  PositionSource,
} from "./types";
import { findNearestPort, findStsZone, distanceNm } from "./ports";

// ── Configuration ──────────────────────────────────────────

const MAX_TRACK_POINTS = 200;        // Per vessel sliding window
const DARK_THRESHOLD_MS = 10 * 60_000; // 10 min gap = dark period
const PORT_SPEED_THRESHOLD = 0.5;     // kn — at port if below this
const PORT_DWELL_MIN_MS = 15 * 60_000; // 15 min minimum to count as port call
const SPEED_ANOMALY_RATIO = 4;        // calculated > N× reported = anomaly
const SPEED_ANOMALY_MIN_KN = 25;      // minimum calculated speed to flag
const MAX_RISK_FACTORS = 20;          // Cap risk factors per vessel

// ── Internal State ─────────────────────────────────────────

interface VesselState {
  mmsi: string;
  name: string;
  shipType: string;
  flag: string;
  destination: string;

  trackPoints: TrackPoint[];
  portCalls: PortCall[];
  darkPeriods: DarkPeriod[];
  riskFactors: RiskFactor[];

  // Port-call detection state
  currentPort: { portId: string; portName: string; country: string; arrivedAt: number } | null;

  firstSeen: number;
  lastSeen: number;
}

interface FusionState {
  vessels: Map<string, VesselState>;
  lastIngestTime: number;
  totalIngested: number;
}

const STATE_KEY = "__maritime_fusion_v1__";

function getState(): FusionState {
  const g = globalThis as unknown as Record<string, FusionState>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = {
      vessels: new Map(),
      lastIngestTime: 0,
      totalIngested: 0,
    };
  }
  return g[STATE_KEY];
}

// ── Haversine (local copy to avoid cross-module issues) ────

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 / 1.852; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Position Ingestion ─────────────────────────────────────

function getOrCreateVessel(state: FusionState, v: Vessel): VesselState {
  let vs = state.vessels.get(v.mmsi);
  if (!vs) {
    vs = {
      mmsi: v.mmsi,
      name: v.name,
      shipType: v.shipType,
      flag: v.flag,
      destination: v.destination,
      trackPoints: [],
      portCalls: [],
      darkPeriods: [],
      riskFactors: [],
      currentPort: null,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };
    state.vessels.set(v.mmsi, vs);
  }
  return vs;
}

function ingestPosition(state: FusionState, v: Vessel): void {
  const vs = getOrCreateVessel(state, v);
  const now = Date.now();

  // Update metadata
  if (v.name && v.name !== "Unknown") vs.name = v.name;
  if (v.shipType && v.shipType !== "Unknown") vs.shipType = v.shipType;
  if (v.flag) vs.flag = v.flag;
  if (v.destination) vs.destination = v.destination;

  // Create track point
  const tp: TrackPoint = {
    lat: v.latitude,
    lon: v.longitude,
    timestamp: now,
    speed: v.speed,
    course: v.course,
    heading: v.heading,
    source: "ais" as PositionSource,
    confidence: 1.0,
  };

  const prev = vs.trackPoints[vs.trackPoints.length - 1];

  // Skip duplicate positions (same lat/lon within 2 seconds)
  if (prev && now - prev.timestamp < 2000 &&
      Math.abs(prev.lat - tp.lat) < 0.0001 &&
      Math.abs(prev.lon - tp.lon) < 0.0001) {
    return;
  }

  // ── Dark period detection ──────────────────────────────
  if (prev) {
    const gapMs = now - prev.timestamp;
    if (gapMs > DARK_THRESHOLD_MS) {
      const gapDist = haversineNm(prev.lat, prev.lon, tp.lat, tp.lon);

      // Interpolate positions during gap
      const interpolated = interpolateGap(prev, tp, gapMs);

      vs.darkPeriods.push({
        start: prev.timestamp,
        end: now,
        durationMinutes: gapMs / 60_000,
        lastKnownLat: prev.lat,
        lastKnownLon: prev.lon,
        resumedLat: tp.lat,
        resumedLon: tp.lon,
        gapDistanceNm: gapDist,
        interpolatedTrack: interpolated,
      });

      // Add risk factor if gap is significant
      if (gapMs > 30 * 60_000) {
        addRiskFactor(vs, {
          type: "ais_gap",
          description: `AIS dark for ${Math.round(gapMs / 60_000)}min, moved ${gapDist.toFixed(1)}nm`,
          severity: gapMs > 120 * 60_000 ? "high" : gapMs > 60 * 60_000 ? "medium" : "low",
          timestamp: now,
        });
      }
    }
  }

  // ── Speed anomaly detection (requires 3+ points) ───────
  if (vs.trackPoints.length >= 2) {
    const older = vs.trackPoints[vs.trackPoints.length - 2];
    const timeDeltaH = (now - older.timestamp) / 3_600_000;
    if (timeDeltaH > 0.01) {
      const calcSpeed = haversineNm(older.lat, older.lon, tp.lat, tp.lon) / timeDeltaH;
      if (v.speed > 0 && calcSpeed > v.speed * SPEED_ANOMALY_RATIO && calcSpeed > SPEED_ANOMALY_MIN_KN) {
        addRiskFactor(vs, {
          type: "speed_anomaly",
          description: `Calc ${calcSpeed.toFixed(0)}kn vs reported ${v.speed.toFixed(0)}kn`,
          severity: "high",
          timestamp: now,
        });
      }
    }
  }

  // ── Port call detection ────────────────────────────────
  if (v.speed < PORT_SPEED_THRESHOLD) {
    const nearPort = findNearestPort(v.latitude, v.longitude);
    if (nearPort) {
      if (!vs.currentPort || vs.currentPort.portId !== nearPort.id) {
        // Close previous port call if any
        if (vs.currentPort) {
          finalizePortCall(vs, now);
        }
        vs.currentPort = {
          portId: nearPort.id,
          portName: nearPort.name,
          country: nearPort.country,
          arrivedAt: now,
        };
      }
    } else if (vs.currentPort) {
      // Left port proximity but still slow — could be anchored nearby
      // Only close if we're actually moving away
      if (v.speed > 1) {
        finalizePortCall(vs, now);
      }
    }
  } else if (vs.currentPort && v.speed > 2) {
    // Moving at meaningful speed — definitely departed
    finalizePortCall(vs, now);
  }

  // ── STS zone detection ─────────────────────────────────
  if (vs.shipType === "Tanker" && v.speed < 3) {
    const stsZone = findStsZone(v.latitude, v.longitude);
    if (stsZone) {
      // Only add once per visit (check if recent factor exists)
      const recentSts = vs.riskFactors.find(
        (f) => f.type === "sts_proximity" && now - f.timestamp < 30 * 60_000
      );
      if (!recentSts) {
        addRiskFactor(vs, {
          type: "sts_proximity",
          description: `Tanker in STS zone: ${stsZone.name}`,
          severity: "medium",
          timestamp: now,
        });
      }
    }
  }

  // ── Heading mismatch ───────────────────────────────────
  if (v.speed > 5 && v.heading > 0 && v.destination) {
    // Simple check: will improve with port lookup for destination
    const headingNorth = v.heading > 270 || v.heading < 90;
    const destSuggests = estimateDestinationDirection(v.destination);
    if (destSuggests && destSuggests !== "unknown") {
      const mismatch =
        (headingNorth && destSuggests === "south") ||
        (!headingNorth && destSuggests === "north");
      if (mismatch) {
        const recentHm = vs.riskFactors.find(
          (f) => f.type === "heading_mismatch" && now - f.timestamp < 60 * 60_000
        );
        if (!recentHm) {
          addRiskFactor(vs, {
            type: "heading_mismatch",
            description: `Heading ${v.heading.toFixed(0)}° but dest ${v.destination}`,
            severity: "low",
            timestamp: now,
          });
        }
      }
    }
  }

  // ── Store track point ──────────────────────────────────
  vs.trackPoints.push(tp);
  if (vs.trackPoints.length > MAX_TRACK_POINTS) {
    vs.trackPoints = vs.trackPoints.slice(-MAX_TRACK_POINTS);
  }

  vs.lastSeen = now;
}

// ── Helpers ────────────────────────────────────────────────

function addRiskFactor(vs: VesselState, factor: RiskFactor): void {
  vs.riskFactors.push(factor);
  if (vs.riskFactors.length > MAX_RISK_FACTORS) {
    vs.riskFactors = vs.riskFactors.slice(-MAX_RISK_FACTORS);
  }
}

function finalizePortCall(vs: VesselState, departTime: number): void {
  if (!vs.currentPort) return;
  const dwell = departTime - vs.currentPort.arrivedAt;
  if (dwell >= PORT_DWELL_MIN_MS) {
    vs.portCalls.push({
      portId: vs.currentPort.portId,
      portName: vs.currentPort.portName,
      country: vs.currentPort.country,
      arrived: vs.currentPort.arrivedAt,
      departed: departTime,
      durationHours: dwell / 3_600_000,
      inferred: true,
    });
  }
  vs.currentPort = null;
}

function interpolateGap(start: TrackPoint, end: TrackPoint, gapMs: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  // Generate interpolated positions every 5 minutes during gap
  const stepMs = 5 * 60_000;
  const steps = Math.min(Math.floor(gapMs / stepMs), 20); // Cap at 20 interpolated points

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lon: start.lon + (end.lon - start.lon) * t,
      timestamp: start.timestamp + gapMs * t,
      speed: start.speed + (end.speed - start.speed) * t,
      course: start.course, // Maintain last known course
      heading: start.heading,
      source: "interpolated",
      confidence: Math.max(0.1, 0.5 - t * 0.4), // Confidence decays
    });
  }

  return points;
}

function estimateDestinationDirection(dest: string): "north" | "south" | "unknown" {
  const d = dest.toUpperCase();
  const northPorts = ["RAS TANURA", "BASRA", "KHARG", "MINA AL AHMADI", "ROTTERDAM", "HAMBURG", "FELIXSTOWE"];
  const southPorts = ["FUJAIRAH", "MUSCAT", "MUMBAI", "SINGAPORE", "JEBEL ALI", "DURBAN"];

  if (northPorts.some((p) => d.includes(p))) return "north";
  if (southPorts.some((p) => d.includes(p))) return "south";
  return "unknown";
}

// ── Risk Scoring ───────────────────────────────────────────

function computeRisk(vs: VesselState): VesselRisk {
  let score = 0;

  // Recent risk factors (last 2 hours)
  const cutoff = Date.now() - 2 * 60 * 60_000;
  const recent = vs.riskFactors.filter((f) => f.timestamp > cutoff);

  for (const f of recent) {
    switch (f.severity) {
      case "high": score += 25; break;
      case "medium": score += 12; break;
      case "low": score += 5; break;
    }
  }

  // Dark periods in last 6 hours
  const darkCutoff = Date.now() - 6 * 60 * 60_000;
  const recentDark = vs.darkPeriods.filter((dp) => dp.start > darkCutoff);
  score += recentDark.length * 8;

  // Long dark periods (>1 hour) weight more
  for (const dp of recentDark) {
    if (dp.durationMinutes > 60) score += 15;
    if (dp.gapDistanceNm && dp.gapDistanceNm > 50) score += 10;
  }

  // Flag-state risk (simplified — certain flags associated with higher risk)
  const highRiskFlags = ["CM", "TG", "TZ", "GQ", "KH", "CW"];
  if (highRiskFlags.includes(vs.flag)) {
    score += 10;
    // Don't double-add; check if already flagged
    const hasFlagFactor = vs.riskFactors.some((f) => f.type === "flag_risk");
    if (!hasFlagFactor) {
      addRiskFactor(vs, {
        type: "flag_risk",
        description: `Flag state ${vs.flag} is associated with higher risk`,
        severity: "low",
        timestamp: Date.now(),
      });
    }
  }

  score = Math.min(100, score);
  const level: VesselRisk["level"] =
    score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return { score, level, factors: recent };
}

// ── Track Analytics ────────────────────────────────────────

function computeAnalytics(vs: VesselState): {
  totalDistanceNm: number;
  averageSpeedKn: number;
  trackConfidence: number;
  sourceCounts: Record<PositionSource, number>;
} {
  let totalDist = 0;
  let speedSum = 0;
  let speedCount = 0;
  const sourceCounts: Record<PositionSource, number> = {
    ais: 0, satellite: 0, port_inferred: 0, interpolated: 0,
  };

  for (let i = 1; i < vs.trackPoints.length; i++) {
    const a = vs.trackPoints[i - 1];
    const b = vs.trackPoints[i];
    totalDist += haversineNm(a.lat, a.lon, b.lat, b.lon);
    if (b.speed > 0) {
      speedSum += b.speed;
      speedCount++;
    }
    sourceCounts[b.source]++;
  }
  if (vs.trackPoints.length > 0) {
    sourceCounts[vs.trackPoints[0].source]++;
  }

  // Confidence: ratio of actual AIS points to expected points
  // Expected ≈ 1 per 30 seconds over the tracking duration
  const durationMs = vs.lastSeen - vs.firstSeen;
  const expectedPoints = Math.max(1, durationMs / 30_000);
  const aisPoints = sourceCounts.ais;
  const trackConfidence = Math.min(1.0, aisPoints / expectedPoints);

  return {
    totalDistanceNm: totalDist,
    averageSpeedKn: speedCount > 0 ? speedSum / speedCount : 0,
    trackConfidence,
    sourceCounts,
  };
}

// ── Public API ─────────────────────────────────────────────

/**
 * Ingest a batch of vessel positions from AIS.
 * Called by /api/vessels on each request.
 */
export function ingestBatch(vessels: Vessel[]): void {
  const state = getState();
  state.lastIngestTime = Date.now();

  for (const v of vessels) {
    // Skip invalid
    if (!v.mmsi || !v.latitude || !v.longitude) continue;
    if (v.latitude === 0 && v.longitude === 0) continue;

    ingestPosition(state, v);
    state.totalIngested++;
  }

  // Expire vessels not seen in 2 hours
  const expiry = Date.now() - 2 * 60 * 60_000;
  for (const [mmsi, vs] of state.vessels) {
    if (vs.lastSeen < expiry) {
      state.vessels.delete(mmsi);
    }
  }
}

/**
 * Get the fused track profile for a specific vessel.
 */
export function getTrack(mmsi: string): FusedVesselTrack | null {
  const state = getState();
  const vs = state.vessels.get(mmsi);
  if (!vs) return null;

  const risk = computeRisk(vs);
  const analytics = computeAnalytics(vs);

  // Close current port call for display (if any)
  const portCalls = [...vs.portCalls];
  if (vs.currentPort) {
    const now = Date.now();
    portCalls.push({
      portId: vs.currentPort.portId,
      portName: vs.currentPort.portName,
      country: vs.currentPort.country,
      arrived: vs.currentPort.arrivedAt,
      departed: null,
      durationHours: (now - vs.currentPort.arrivedAt) / 3_600_000,
      inferred: true,
    });
  }

  return {
    mmsi: vs.mmsi,
    name: vs.name,
    shipType: vs.shipType,
    flag: vs.flag,
    destination: vs.destination,
    lastPosition: vs.trackPoints[vs.trackPoints.length - 1] || null,
    trackPoints: vs.trackPoints,
    portCalls,
    darkPeriods: vs.darkPeriods,
    risk,
    trackConfidence: analytics.trackConfidence,
    totalDistanceNm: analytics.totalDistanceNm,
    averageSpeedKn: analytics.averageSpeedKn,
    sourceCounts: analytics.sourceCounts,
    firstSeen: vs.firstSeen,
    lastSeen: vs.lastSeen,
    totalPositions: vs.trackPoints.length,
  };
}

/**
 * Get all fused tracks (summary mode — limited fields).
 */
export function getAllTracks(): FusedVesselTrack[] {
  const state = getState();
  const tracks: FusedVesselTrack[] = [];

  for (const [, vs] of state.vessels) {
    const risk = computeRisk(vs);
    const analytics = computeAnalytics(vs);

    tracks.push({
      mmsi: vs.mmsi,
      name: vs.name,
      shipType: vs.shipType,
      flag: vs.flag,
      destination: vs.destination,
      lastPosition: vs.trackPoints[vs.trackPoints.length - 1] || null,
      trackPoints: [], // Omit full track for summary
      portCalls: vs.portCalls.slice(-3), // Last 3 port calls
      darkPeriods: vs.darkPeriods.slice(-3), // Last 3 dark periods
      risk,
      trackConfidence: analytics.trackConfidence,
      totalDistanceNm: analytics.totalDistanceNm,
      averageSpeedKn: analytics.averageSpeedKn,
      sourceCounts: analytics.sourceCounts,
      firstSeen: vs.firstSeen,
      lastSeen: vs.lastSeen,
      totalPositions: vs.trackPoints.length,
    });
  }

  return tracks;
}

/**
 * Get fusion engine statistics.
 */
export function getFusionStats(): FusionStats {
  const state = getState();

  let totalPositions = 0;
  let totalPortCalls = 0;
  let totalDarkPeriods = 0;
  let activeDark = 0;
  let highRisk = 0;

  for (const [, vs] of state.vessels) {
    totalPositions += vs.trackPoints.length;
    totalPortCalls += vs.portCalls.length;
    totalDarkPeriods += vs.darkPeriods.length;

    const openDark = vs.darkPeriods.filter((dp) => dp.end === null);
    activeDark += openDark.length;

    const risk = computeRisk(vs);
    if (risk.level === "high" || risk.level === "critical") highRisk++;
  }

  return {
    trackedVessels: state.vessels.size,
    totalPositions,
    totalPortCalls,
    totalDarkPeriods,
    activeDarkPeriods: activeDark,
    highRiskVessels: highRisk,
    lastIngestTime: state.lastIngestTime,
  };
}
