import { NextRequest, NextResponse } from "next/server";
import { initAISStream, getTrackedVessels } from "@/lib/aisstream-client";
import {
  parseContainerNumber,
  matchVesselsForLine,
  type ContainerLocation,
} from "@/lib/container-tracking";
import { findNearestPort } from "@/lib/maritime/ports";

/**
 * Container Tracking API
 *
 * Accepts a container number and returns its likely location by:
 * 1. Parsing the container number to identify shipping line
 * 2. Querying external tracking API (if CONTAINER_API_KEY set)
 * 3. Cross-referencing with live AIS data to find matching vessels
 *
 * Query: GET /api/container/track?number=MAEU1234567
 */

// In-memory cache for external API results
const trackCache = new Map<string, { result: ContainerLocation; timestamp: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

// Terminal49 tracking request cache (tracks submitted async requests)
const t49TrackingCache = new Map<string, { id: string; status: string; createdAt: string }>();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const containerNum = searchParams.get("number")?.trim();

  if (!containerNum) {
    return NextResponse.json(
      { error: "Missing container number. Use ?number=MAEU1234567" },
      { status: 400 }
    );
  }

  // Parse the container number
  const parsed = parseContainerNumber(containerNum);

  if (!parsed.normalized || parsed.normalized.length < 7) {
    return NextResponse.json(
      {
        error: "Invalid container number format",
        hint: "Expected format: ABCU1234567 (3 letters + U/J/Z + 7 digits)",
        parsed,
      },
      { status: 400 }
    );
  }

  // Check cache
  const cached = trackCache.get(parsed.normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      container: parsed,
      location: cached.result,
      cached: true,
    });
  }

  // Try external tracking API if available
  const externalResult = await tryExternalTracking(parsed.normalized, parsed.shippingLine?.scac);
  if (externalResult) {
    trackCache.set(parsed.normalized, { result: externalResult, timestamp: Date.now() });
    return NextResponse.json({
      container: parsed,
      location: externalResult,
      cached: false,
    });
  }

  // Fallback: Cross-reference with AIS vessel data
  await initAISStream();
  const vessels = getTrackedVessels();

  let location: ContainerLocation;

  if (parsed.shippingLine) {
    const vesselData = vessels.map((v) => ({
      name: v.name,
      mmsi: v.mmsi,
      lat: v.latitude,
      lon: v.longitude,
      speed: v.speed,
      destination: v.destination,
    }));

    const matches = matchVesselsForLine(vesselData, parsed.shippingLine);

    if (matches.length > 0) {
      // Sort by relevance: moving vessels more likely to carry containers
      matches.sort((a, b) => b.speed - a.speed);
      const best = matches[0];

      // Check if vessel is near a known port
      const nearPort = findNearestPort(best.lat, best.lon, 30);

      location = {
        status: best.speed > 1 ? "in_transit" : "at_port",
        vesselName: best.name,
        vesselMmsi: best.mmsi,
        portName: nearPort?.name || null,
        latitude: best.lat,
        longitude: best.lon,
        lastEvent: `Container likely aboard ${parsed.shippingLine.name} vessel`,
        lastEventTime: new Date().toISOString(),
        shippingLine: parsed.shippingLine.name,
        containerNumber: parsed.normalized,
        source: "ais_match",
        confidence: 0.3, // Low confidence — line match only
      };

      // If vessel is slow near a port, it's probably at port
      if (best.speed < 0.5 && nearPort) {
        location.status = "at_port";
        location.lastEvent = `Vessel ${best.name} at ${nearPort.name} (${nearPort.country})`;
        location.confidence = 0.45; // Higher confidence when port-matched
      } else if (best.speed < 0.5) {
        location.status = "at_port";
        location.lastEvent = `Vessel ${best.name} stationary at ${best.lat.toFixed(2)}N, ${best.lon.toFixed(2)}E`;
      } else {
        location.lastEvent = `Vessel ${best.name} underway at ${best.speed.toFixed(1)}kn`;
      }

      // If vessel has a destination, mention it
      if (best.destination) {
        location.lastEvent += ` → ${best.destination}`;
      }
    } else {
      // No matching vessels in AIS
      const t49Submitted = !!(process.env.TERMINAL49_API_KEY);

      location = {
        status: "unknown",
        vesselName: null,
        vesselMmsi: null,
        portName: null,
        latitude: null,
        longitude: null,
        lastEvent: t49Submitted
          ? `Identified as ${parsed.shippingLine.name} container. Tracking request submitted — no ${parsed.shippingLine.name} vessels in AIS coverage.`
          : `Identified as ${parsed.shippingLine.name} container (SCAC: ${parsed.shippingLine.scac}). No vessels in AIS range. Add tracking API key in Settings (CFG) for precise location.`,
        lastEventTime: null,
        shippingLine: parsed.shippingLine.name,
        containerNumber: parsed.normalized,
        source: "ais_match",
        confidence: 0.1,
      };
    }
  } else {
    location = {
      status: "unknown",
      vesselName: null,
      vesselMmsi: null,
      portName: null,
      latitude: null,
      longitude: null,
      lastEvent: `Owner code "${parsed.ownerCode}" not recognized. Verify container number format.`,
      lastEventTime: null,
      shippingLine: "Unknown",
      containerNumber: parsed.normalized,
      source: "ais_match",
      confidence: 0,
    };
  }

  trackCache.set(parsed.normalized, { result: location, timestamp: Date.now() });

  // Check if Terminal49 tracking was submitted
  const t49Info = t49TrackingCache.get(parsed.normalized);

  return NextResponse.json({
    container: parsed,
    location,
    matchedVessels: parsed.shippingLine
      ? matchVesselsForLine(
          vessels.map((v) => ({
            name: v.name,
            mmsi: v.mmsi,
            lat: v.latitude,
            lon: v.longitude,
            speed: v.speed,
            destination: v.destination,
          })),
          parsed.shippingLine
        ).slice(0, 10)
      : [],
    tracking: t49Info
      ? {
          terminal49: {
            requestId: t49Info.id,
            status: t49Info.status,
            submittedAt: t49Info.createdAt,
            dashboardUrl: `https://app.terminal49.com`,
          },
        }
      : null,
    cached: false,
  });
}

/**
 * Try external container tracking APIs.
 * Supports: VesselFinder, Searates, ShipsGo, Terminal49, Dockflow.
 *
 * Set one of these env vars:
 * - VESSELFINDER_CONTAINER_API_KEY
 * - SEARATES_API_KEY
 * - SHIPSGO_API_KEY
 * - TERMINAL49_API_KEY
 * - DOCKFLOW_API_KEY
 */
async function tryExternalTracking(containerNumber: string, scac?: string): Promise<ContainerLocation | null> {
  // VesselFinder Container Tracking API
  // Endpoint: GET /container/{apiKey}/{containerNumber}/AUTO
  const vfKey = process.env.VESSELFINDER_CONTAINER_API_KEY;
  if (vfKey) {
    try {
      const res = await fetch(
        `https://container.vesselfinder.com/api/1.0/container/${vfKey}/${containerNumber}/AUTO`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== "error") {
          // VesselFinder returns: containers[0].events[], vessel info, etc.
          const container = data.containers?.[0];
          const lastEvent = container?.events?.[0];
          const vessel = container?.vessel;

          return {
            status: vessel?.name ? "on_vessel" : lastEvent?.location ? "at_port" : "in_transit",
            vesselName: vessel?.name || null,
            vesselMmsi: vessel?.mmsi ? String(vessel.mmsi) : null,
            portName: lastEvent?.location || null,
            latitude: vessel?.lat || lastEvent?.lat || null,
            longitude: vessel?.lon || lastEvent?.lon || null,
            lastEvent: lastEvent?.description || lastEvent?.status || "Tracked via VesselFinder",
            lastEventTime: lastEvent?.date || null,
            shippingLine: data.sealine || "Unknown",
            containerNumber,
            source: "api",
            confidence: 0.95,
          };
        }
      }
    } catch {
      // Fall through to next method
    }
  }

  // Searates Tracking API
  const searatesKey = process.env.SEARATES_API_KEY;
  if (searatesKey) {
    try {
      const res = await fetch(
        `https://www.searates.com/tracking/api?number=${containerNumber}&api_key=${searatesKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          return {
            status: mapExternalStatus(data.status),
            vesselName: data.vessel || null,
            vesselMmsi: null,
            portName: data.port || data.location || null,
            latitude: data.lat || null,
            longitude: data.lon || null,
            lastEvent: data.event || data.status || "Tracked via Searates",
            lastEventTime: data.date || null,
            shippingLine: data.carrier || "Unknown",
            containerNumber,
            source: "api",
            confidence: 0.9,
          };
        }
      }
    } catch {
      // Fall through to next method
    }
  }

  // ShipsGo Tracking API
  const shipsgoKey = process.env.SHIPSGO_API_KEY;
  if (shipsgoKey) {
    try {
      const res = await fetch(
        `https://shipsgo.com/api/v1.2/ContainerService/GetContainerInfo/${containerNumber}?authCode=${shipsgoKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          return {
            status: data.vesselName ? "on_vessel" : "at_port",
            vesselName: data.vesselName || null,
            vesselMmsi: null,
            portName: data.lastPort || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            lastEvent: data.lastStatus || "Tracked via ShipsGo",
            lastEventTime: data.lastStatusDate || null,
            shippingLine: data.shippingLine || "Unknown",
            containerNumber,
            source: "api",
            confidence: 0.85,
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // Terminal49 API — submit tracking request (async: results come later)
  // Free tier can only create requests; results visible on Terminal49 dashboard
  const t49Key = process.env.TERMINAL49_API_KEY;
  if (t49Key && scac) {
    try {
      const res = await fetch(
        `https://api.terminal49.com/v2/tracking_requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/vnd.api+json",
            "Authorization": `Token ${t49Key}`,
          },
          body: JSON.stringify({
            data: {
              type: "tracking_request",
              attributes: {
                request_type: "container",
                request_number: containerNumber,
                scac,
              },
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const trackingId = data?.data?.id;
        // Terminal49 free tier: tracking request created, but we can't read results via API
        // Store the tracking ID for reference — user can check Terminal49 dashboard
        if (trackingId) {
          t49TrackingCache.set(containerNumber, {
            id: trackingId,
            status: data?.data?.attributes?.status || "pending",
            createdAt: new Date().toISOString(),
          });
        }
        // Don't return here — fall through to AIS matching since we can't read results
      }
    } catch {
      // Fall through
    }
  }

  // Dockflow API (free tier: 30 lookups/month)
  const dockflowKey = process.env.DOCKFLOW_API_KEY;
  if (dockflowKey) {
    try {
      const res = await fetch(
        `https://api.dockflow.com/v1/container/${containerNumber}`,
        {
          headers: {
            "Authorization": `Bearer ${dockflowKey}`,
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          return {
            status: data.vessel ? "on_vessel" : data.location ? "at_port" : "in_transit",
            vesselName: data.vessel || null,
            vesselMmsi: null,
            portName: data.location || data.port || null,
            latitude: data.lat || null,
            longitude: data.lon || null,
            lastEvent: data.status || data.event || "Tracked via Dockflow",
            lastEventTime: data.timestamp || data.date || null,
            shippingLine: data.carrier || data.shipping_line || "Unknown",
            containerNumber,
            source: "api" as const,
            confidence: 0.88,
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  return null;
}

function mapExternalStatus(status: string): ContainerLocation["status"] {
  const s = status.toLowerCase();
  if (s.includes("vessel") || s.includes("sail") || s.includes("transit")) return "on_vessel";
  if (s.includes("port") || s.includes("terminal") || s.includes("gate")) return "at_port";
  if (s.includes("transit") || s.includes("move")) return "in_transit";
  return "unknown";
}
