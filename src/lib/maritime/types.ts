/**
 * Maritime Fusion System — Type Definitions
 *
 * Multi-source intelligence fusion for vessel tracking:
 * AIS + port proximity + movement history + gap analysis + risk scoring.
 */

// ── Track Points ──────────────────────────────────────────

export type PositionSource =
  | "ais"           // Direct AIS transponder
  | "satellite"     // Satellite AIS or imagery
  | "port_inferred" // Inferred from port proximity
  | "interpolated"; // Gap-fill interpolation

export interface TrackPoint {
  lat: number;
  lon: number;
  timestamp: number;
  speed: number;     // knots
  course: number;    // degrees
  heading: number;   // degrees (511 = unavailable)
  source: PositionSource;
  confidence: number; // 0.0 – 1.0
}

// ── Port Calls ────────────────────────────────────────────

export interface PortCall {
  portId: string;
  portName: string;
  country: string;
  arrived: number;       // timestamp
  departed: number | null;
  durationHours: number;
  inferred: boolean;     // true = detected from position/speed, not declared
}

// ── Dark Periods (AIS Gaps) ───────────────────────────────

export interface DarkPeriod {
  start: number;         // timestamp when AIS was last seen
  end: number | null;    // timestamp when AIS resumed (null = still dark)
  durationMinutes: number;
  lastKnownLat: number;
  lastKnownLon: number;
  resumedLat: number | null;
  resumedLon: number | null;
  gapDistanceNm: number | null; // straight-line distance during gap
  interpolatedTrack: TrackPoint[];
}

// ── Risk Assessment ───────────────────────────────────────

export interface RiskFactor {
  type:
    | "ais_gap"
    | "speed_anomaly"
    | "sts_proximity"
    | "heading_mismatch"
    | "flag_risk"
    | "dark_meeting"
    | "zone_loiter";
  description: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
}

export interface VesselRisk {
  score: number;          // 0–100
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
}

// ── Fused Vessel Profile ──────────────────────────────────

export interface FusedVesselTrack {
  mmsi: string;
  name: string;
  shipType: string;
  flag: string;
  destination: string;

  // Current state
  lastPosition: TrackPoint | null;

  // History (sliding window, most recent first)
  trackPoints: TrackPoint[];
  portCalls: PortCall[];
  darkPeriods: DarkPeriod[];

  // Derived analytics
  risk: VesselRisk;
  trackConfidence: number;   // 0.0–1.0 overall
  totalDistanceNm: number;
  averageSpeedKn: number;
  sourceCounts: Record<PositionSource, number>;

  // Metadata
  firstSeen: number;
  lastSeen: number;
  totalPositions: number;
}

// ── Fusion Engine Stats ───────────────────────────────────

export interface FusionStats {
  trackedVessels: number;
  totalPositions: number;
  totalPortCalls: number;
  totalDarkPeriods: number;
  activeDarkPeriods: number;
  highRiskVessels: number;
  lastIngestTime: number;
}
