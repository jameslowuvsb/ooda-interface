import type { Vessel } from "@/types";

/**
 * ORIENT: Dark Ship Detection
 *
 * Detects vessels that may be engaged in sanctions evasion or illicit activity
 * by analyzing AIS transponder behavior patterns.
 *
 * Techniques:
 * 1. AIS gap detection — vessel was seen, then disappears, then reappears
 * 2. Speed anomalies — reported speed inconsistent with position changes
 * 3. Suspicious anchoring zones — known STS (ship-to-ship) transfer areas
 * 4. Flag/destination mismatches — declared destination doesn't match heading
 */

export interface DarkShipAlert {
  id: string;
  vesselMmsi: string;
  vesselName: string;
  alertType: "ais_gap" | "speed_anomaly" | "sts_zone" | "heading_mismatch";
  severity: "low" | "medium" | "high";
  description: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Known STS (ship-to-ship) transfer zones in the Hormuz region
const STS_ZONES = [
  { name: "Khor Fakkan anchorage", lat: 25.35, lon: 56.35, radiusKm: 10 },
  { name: "Fujairah anchorage", lat: 25.15, lon: 56.38, radiusKm: 15 },
  { name: "Persian Gulf STS zone", lat: 26.8, lon: 55.2, radiusKm: 20 },
  { name: "Gulf of Oman STS zone", lat: 25.0, lon: 57.8, radiusKm: 15 },
];

// Track vessel history for gap detection
const vesselHistory = new Map<
  string,
  { positions: { lat: number; lon: number; time: number; speed: number }[] }
>();

const MAX_HISTORY = 50;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInStsZone(lat: number, lon: number): string | null {
  for (const zone of STS_ZONES) {
    const dist = haversineKm(lat, lon, zone.lat, zone.lon);
    if (dist <= zone.radiusKm) return zone.name;
  }
  return null;
}

/**
 * Analyze vessels for suspicious behavior patterns
 */
export function detectDarkShips(vessels: Vessel[]): DarkShipAlert[] {
  const alerts: DarkShipAlert[] = [];
  const seen = new Set<string>(); // Deduplicate: one alert per vessel per type
  const now = Date.now();

  for (const vessel of vessels) {
    // Update history
    if (!vesselHistory.has(vessel.mmsi)) {
      vesselHistory.set(vessel.mmsi, { positions: [] });
    }
    const history = vesselHistory.get(vessel.mmsi)!;
    history.positions.push({
      lat: vessel.latitude,
      lon: vessel.longitude,
      time: now,
      speed: vessel.speed,
    });
    if (history.positions.length > MAX_HISTORY) {
      history.positions.shift();
    }

    // Check 1: STS zone anchoring (tankers loitering in known transfer areas)
    if (vessel.shipType === "Tanker" && vessel.speed < 1) {
      const zone = isInStsZone(vessel.latitude, vessel.longitude);
      if (zone) {
        // Deduplicate: one alert per vessel per alert type
        const alertId = `sts-${vessel.mmsi}`;
        if (!seen.has(alertId)) {
          seen.add(alertId);
          alerts.push({
            id: alertId,
            vesselMmsi: vessel.mmsi,
            vesselName: vessel.name,
            alertType: "sts_zone",
            severity: "medium",
            description: `Tanker ${vessel.name} (${vessel.flag}) in STS zone: ${zone}`,
            latitude: vessel.latitude,
            longitude: vessel.longitude,
            timestamp: now,
          });
        }
      }
    }

    // Check 2: Heading vs destination mismatch
    if (
      vessel.speed > 5 &&
      vessel.heading > 0 &&
      vessel.destination
    ) {
      const headingNorth = vessel.heading > 270 || vessel.heading < 90;
      const destNorth = ["RAS TANURA", "BASRA", "KHARG ISLAND", "MINA AL AHMADI"].some(
        (d) => vessel.destination.toUpperCase().includes(d)
      );
      const destSouth = ["FUJAIRAH", "MUSCAT", "MUMBAI", "SINGAPORE"].some(
        (d) => vessel.destination.toUpperCase().includes(d)
      );

      if ((headingNorth && destSouth) || (!headingNorth && destNorth)) {
        const alertId = `heading-${vessel.mmsi}`;
        if (!seen.has(alertId)) {
          seen.add(alertId);
          alerts.push({
            id: alertId,
            vesselMmsi: vessel.mmsi,
            vesselName: vessel.name,
            alertType: "heading_mismatch",
            severity: "low",
            description: `${vessel.name} heading ${vessel.heading.toFixed(0)}° but dest ${vessel.destination}`,
            latitude: vessel.latitude,
            longitude: vessel.longitude,
            timestamp: now,
          });
        }
      }
    }

    // Check 3: Speed anomaly — reported speed vs actual position change
    if (history.positions.length >= 3) {
      // Use 3+ positions for more reliable detection (reduces false positives)
      const prev = history.positions[history.positions.length - 3];
      const curr = history.positions[history.positions.length - 1];
      const timeDeltaHours = (curr.time - prev.time) / 3_600_000;

      if (timeDeltaHours > 0.01) {
        const distKm = haversineKm(prev.lat, prev.lon, curr.lat, curr.lon);
        const distNm = distKm / 1.852;
        const calculatedSpeed = distNm / timeDeltaHours;

        // Tighter threshold: >5x reported AND >30kn calculated
        if (
          vessel.speed > 0 &&
          calculatedSpeed > vessel.speed * 5 &&
          calculatedSpeed > 30
        ) {
          const alertId = `speed-${vessel.mmsi}`;
          if (!seen.has(alertId)) {
            seen.add(alertId);
            alerts.push({
              id: alertId,
              vesselMmsi: vessel.mmsi,
              vesselName: vessel.name,
              alertType: "speed_anomaly",
              severity: "high",
              description: `${vessel.name} calc ${calculatedSpeed.toFixed(0)}kn vs reported ${vessel.speed.toFixed(0)}kn`,
              latitude: vessel.latitude,
              longitude: vessel.longitude,
              timestamp: now,
            });
          }
        }
      }
    }
  }

  // Check 4: AIS gap — vessels that were recently seen but are now missing
  const currentMmsis = new Set(vessels.map((v) => v.mmsi));
  for (const [mmsi, hist] of vesselHistory.entries()) {
    if (!currentMmsis.has(mmsi) && hist.positions.length > 0) {
      const lastSeen = hist.positions[hist.positions.length - 1];
      const gapMinutes = (now - lastSeen.time) / 60_000;

      if (gapMinutes > 2 && gapMinutes < 10) {
        const alertId = `gap-${mmsi}`;
        if (!seen.has(alertId)) {
          seen.add(alertId);
          alerts.push({
            id: alertId,
            vesselMmsi: mmsi,
            vesselName: `MMSI:${mmsi}`,
            alertType: "ais_gap",
            severity: "high",
            description: `MMSI:${mmsi} went dark ${gapMinutes.toFixed(0)}min ago`,
            latitude: lastSeen.lat,
            longitude: lastSeen.lon,
            timestamp: now,
          });
        }
      }
    }
  }

  // Cap total alerts to prevent overcrowding — prioritize high severity
  alerts.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
  });

  return alerts.slice(0, 15);
}
