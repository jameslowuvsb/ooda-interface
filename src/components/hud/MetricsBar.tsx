"use client";

import { useMemo } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import { useAISStatus } from "@/hooks/useAISStatus";

/**
 * Bottom metrics bar — shows real-time vessel counts per strategic chokepoint,
 * AIS connection health, and total entity tracking counts.
 * Click any region to fly the camera there.
 */

interface RegionDef {
  id: string;
  label: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  flyLon: number;
  flyLat: number;
}

const REGIONS: RegionDef[] = [
  { id: "hormuz",   label: "HORMUZ",   latMin: 24.0, latMax: 27.5, lonMin: 54.0,  lonMax: 58.5,  flyLon: 56.3,  flyLat: 26.5  },
  { id: "bab",      label: "BAB",      latMin: 11.0, latMax: 14.0, lonMin: 42.0,  lonMax: 46.0,  flyLon: 43.3,  flyLat: 12.6  },
  { id: "suez",     label: "SUEZ",     latMin: 27.0, latMax: 32.0, lonMin: 32.0,  lonMax: 35.0,  flyLon: 32.5,  flyLat: 30.0  },
  { id: "malacca",  label: "MALACCA",  latMin: -2.0, latMax: 4.0,  lonMin: 99.0,  lonMax: 105.0, flyLon: 101.5, flyLat: 2.5   },
  { id: "scs",      label: "SCS",      latMin: 7.0,  latMax: 16.0, lonMin: 110.0, lonMax: 118.0, flyLon: 114.0, flyLat: 12.0  },
  { id: "gibraltar", label: "GIBRALTAR", latMin: 35.0, latMax: 37.0, lonMin: -7.0,  lonMax: -4.0,  flyLon: -5.5,  flyLat: 36.0  },
  { id: "channel",  label: "CHANNEL",  latMin: 49.5, latMax: 51.5, lonMin: -2.0,  lonMax: 2.0,   flyLon: 0.0,   flyLat: 50.5  },
  { id: "taiwan",   label: "TAIWAN",   latMin: 22.5, latMax: 26.0, lonMin: 117.0, lonMax: 121.0, flyLon: 119.0, flyLat: 24.0  },
  { id: "panama",   label: "PANAMA",   latMin: 7.5,  latMax: 10.0, lonMin: -80.5, lonMax: -78.5, flyLon: -79.5, flyLat: 9.0   },
  { id: "cape",     label: "CAPE",     latMin: -35.5, latMax: -33.0, lonMin: 17.0, lonMax: 21.0, flyLon: 18.5,  flyLat: -34.3 },
];

export function MetricsBar() {
  const vessels = useOODAStore((s) => s.vessels);
  const flights = useOODAStore((s) => s.flights);
  const earthquakes = useOODAStore((s) => s.earthquakes);
  const news = useOODAStore((s) => s.news);
  const flyTo = useOODAStore((s) => s.flyTo);
  const aisStatus = useAISStatus();

  // Compute vessel counts per region
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const region of REGIONS) {
      counts[region.id] = 0;
    }
    for (const v of vessels) {
      for (const region of REGIONS) {
        if (
          v.latitude >= region.latMin &&
          v.latitude <= region.latMax &&
          v.longitude >= region.lonMin &&
          v.longitude <= region.lonMax
        ) {
          counts[region.id]++;
          break;
        }
      }
    }
    return counts;
  }, [vessels]);

  const totalVessels = vessels.length;
  const maxRegionCount = Math.max(1, ...Object.values(regionCounts));

  return (
    <div className="h-8 flex items-center px-2 border-t border-green-900/50 bg-black/90 backdrop-blur-sm gap-1 overflow-x-auto">
      {/* AIS status */}
      <div className="flex items-center gap-1 pr-2 border-r border-green-900/30 shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            aisStatus.connected ? "bg-green-400 animate-pulse" : "bg-red-800"
          }`}
        />
        <span className="font-mono text-[8px] text-green-600 tracking-wider">
          {aisStatus.connected ? "AIS" : "SIM"}
        </span>
        <span className="font-mono text-[9px] text-green-400 tabular-nums">
          {totalVessels}
        </span>
      </div>

      {/* Region pills */}
      {REGIONS.map((region) => {
        const count = regionCounts[region.id];
        const intensity = count / maxRegionCount;
        const hasTraffic = count > 0;

        return (
          <button
            key={region.id}
            onClick={() => flyTo(region.flyLon, region.flyLat, 2_000_000)}
            className="flex items-center gap-1 px-1.5 py-0.5 border border-green-900/20 hover:border-green-700/50 hover:bg-green-400/5 transition-all shrink-0"
            title={`${region.label}: ${count} vessels`}
          >
            {/* Mini bar indicator */}
            <div className="w-1 h-3 bg-green-900/30 relative overflow-hidden">
              <div
                className="absolute bottom-0 w-full transition-all duration-1000"
                style={{
                  height: `${Math.max(hasTraffic ? 15 : 0, intensity * 100)}%`,
                  backgroundColor: hasTraffic
                    ? count > 50
                      ? "#00ff41"
                      : count > 10
                      ? "#00aaff"
                      : "#888888"
                    : "transparent",
                }}
              />
            </div>
            <span
              className="font-mono text-[7px] tracking-wider"
              style={{
                color: hasTraffic ? "#00ff41" : "#333",
              }}
            >
              {region.label}
            </span>
            <span
              className="font-mono text-[8px] tabular-nums"
              style={{
                color: hasTraffic ? "#00ff41" : "#333",
              }}
            >
              {count || "–"}
            </span>
          </button>
        );
      })}

      {/* Other data counts */}
      <div className="flex items-center gap-2 pl-2 border-l border-green-900/30 shrink-0 ml-auto">
        <MiniCount label="FLT" count={flights.length} color="#00ff41" />
        <MiniCount label="EQ" count={earthquakes.length} color="#ffff00" />
        <MiniCount label="NEWS" count={news.length} color="#ffaa00" />
      </div>
    </div>
  );
}

function MiniCount({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="font-mono text-[7px] text-green-800 tracking-wider">
        {label}
      </span>
      <span
        className="font-mono text-[8px] tabular-nums"
        style={{ color: count > 0 ? color : "#333" }}
      >
        {count || "–"}
      </span>
    </div>
  );
}
