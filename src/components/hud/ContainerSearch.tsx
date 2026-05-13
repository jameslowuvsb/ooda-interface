"use client";

import { useState, useCallback } from "react";
import { useOODAStore } from "@/stores/ooda-store";

interface ContainerResult {
  container: {
    normalized: string;
    ownerCode: string;
    valid: boolean;
    shippingLine: { code: string; name: string; scac?: string } | null;
  };
  location: {
    status: "on_vessel" | "at_port" | "in_transit" | "unknown";
    vesselName: string | null;
    vesselMmsi: string | null;
    portName: string | null;
    latitude: number | null;
    longitude: number | null;
    lastEvent: string;
    lastEventTime: string | null;
    shippingLine: string;
    containerNumber: string;
    source: "api" | "ais_match" | "schedule";
    confidence: number;
  };
  matchedVessels: {
    name: string;
    mmsi: string;
    lat: number;
    lon: number;
    speed: number;
    destination: string;
  }[];
  tracking?: {
    terminal49?: {
      requestId: string;
      status: string;
      submittedAt: string;
      dashboardUrl: string;
    };
  } | null;
}

const STATUS_CONFIG = {
  on_vessel: { label: "ON VESSEL", color: "#00aaff" },
  at_port: { label: "AT PORT", color: "#00ff41" },
  in_transit: { label: "IN TRANSIT", color: "#ff8800" },
  unknown: { label: "UNKNOWN", color: "#888888" },
};

export function ContainerSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ContainerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flyTo = useOODAStore((s) => s.flyTo);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch(
          `/api/container/track?number=${encodeURIComponent(q)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Tracking failed");
          return;
        }

        setResult(data);

        // Fly to location if coordinates available
        if (data.location.latitude && data.location.longitude) {
          flyTo(data.location.longitude, data.location.latitude, 1_000_000);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [query, flyTo]
  );

  const handleVesselClick = (vessel: ContainerResult["matchedVessels"][0]) => {
    flyTo(vessel.lon, vessel.lat, 500_000);
    setSelectedEntity({
      id: `vessel-${vessel.mmsi}`,
      type: "vessel",
      name: vessel.name,
      details: {
        mmsi: vessel.mmsi,
        name: vessel.name,
        speed: vessel.speed,
        destination: vessel.destination,
        shipType: "Cargo",
      },
      lon: vessel.lon,
      lat: vessel.lat,
    });
  };

  const loc = result?.location;
  const statusCfg = loc ? STATUS_CONFIG[loc.status] : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <form onSubmit={handleSearch} className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="MAEU1234567"
          maxLength={15}
          className="flex-1 bg-transparent border border-green-900/50 px-2 py-1 text-[10px] font-mono text-green-400 placeholder-green-800 tracking-wider focus:outline-none focus:border-green-600 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-2 py-1 border border-green-900/50 text-[9px] font-mono tracking-wider text-green-600 hover:text-green-400 hover:border-green-600 transition-all disabled:opacity-30"
        >
          {loading ? "..." : "TRACK"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="px-2 py-1 border border-red-900/30 bg-red-400/5 font-mono text-[9px] text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && loc && (
        <div className="border border-green-900/30 bg-green-400/3">
          {/* Container header */}
          <div className="px-2 py-1.5 border-b border-green-900/20 flex items-center justify-between">
            <span className="font-mono text-[10px] text-green-400 font-bold tracking-wider">
              {result.container.normalized}
            </span>
            <span
              className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 border"
              style={{
                color: statusCfg?.color,
                borderColor: `${statusCfg?.color}40`,
                backgroundColor: `${statusCfg?.color}08`,
              }}
            >
              {statusCfg?.label}
            </span>
          </div>

          <div className="p-2 space-y-1.5">
            {/* Shipping line */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] text-green-700">LINE</span>
              <span className="font-mono text-[9px] text-green-400">
                {loc.shippingLine}
              </span>
            </div>

            {/* Vessel */}
            {loc.vesselName && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-green-700">VESSEL</span>
                <span className="font-mono text-[9px] text-blue-400">
                  {loc.vesselName}
                </span>
              </div>
            )}

            {/* Port */}
            {loc.portName && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-green-700">PORT</span>
                <span className="font-mono text-[9px] text-green-400">
                  {loc.portName}
                </span>
              </div>
            )}

            {/* Last event */}
            <div className="pt-1 border-t border-green-900/20">
              <p className="font-mono text-[8px] text-green-600 leading-relaxed">
                {loc.lastEvent}
              </p>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-green-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(loc.confidence * 100)}%`,
                    backgroundColor:
                      loc.confidence > 0.7
                        ? "#00ff41"
                        : loc.confidence > 0.3
                        ? "#ffff00"
                        : "#ff3333",
                  }}
                />
              </div>
              <span className="font-mono text-[7px] text-green-700">
                {Math.round(loc.confidence * 100)}%
              </span>
            </div>

            {/* Fly to button */}
            {loc.latitude && loc.longitude && (
              <button
                onClick={() => flyTo(loc.longitude!, loc.latitude!, 500_000)}
                className="w-full py-1 border border-green-900/40 font-mono text-[9px] tracking-wider text-green-600 hover:text-green-400 hover:border-green-600 transition-all"
              >
                FLY TO LOCATION
              </button>
            )}
          </div>

          {/* Terminal49 tracking info */}
          {result.tracking?.terminal49 && (
            <div className="px-2 pb-2 pt-1 border-t border-green-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="font-mono text-[7px] text-yellow-600 tracking-widest">
                    TERMINAL49: {result.tracking.terminal49.status.toUpperCase()}
                  </span>
                </div>
                <a
                  href={result.tracking.terminal49.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[7px] text-blue-500 hover:text-blue-400 tracking-wider underline underline-offset-2"
                >
                  DASHBOARD
                </a>
              </div>
            </div>
          )}

          {/* Matched vessels */}
          {result.matchedVessels && result.matchedVessels.length > 1 && (
            <div className="px-2 pb-2 pt-1 border-t border-green-900/20">
              <div className="font-mono text-[7px] text-green-800 tracking-widest mb-1">
                {result.matchedVessels.length} {loc.shippingLine} VESSELS IN AIS
              </div>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {result.matchedVessels.slice(0, 8).map((v) => (
                  <button
                    key={v.mmsi}
                    onClick={() => handleVesselClick(v)}
                    className="w-full flex items-center justify-between px-1 py-0.5 text-left hover:bg-green-400/5 transition-colors"
                  >
                    <span className="font-mono text-[8px] text-green-500 truncate">
                      {v.name}
                    </span>
                    <span className="font-mono text-[7px] text-green-700 shrink-0 ml-2">
                      {v.speed.toFixed(1)}kn
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
