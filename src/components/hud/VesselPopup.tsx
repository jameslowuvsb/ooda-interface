"use client";

import { useState, useEffect } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import { getFlag } from "@/lib/flags";
import type { FusedVesselTrack } from "@/lib/maritime/types";

/**
 * Enhanced vessel detail card — AIS data + fused maritime intelligence.
 * Shows vessel info, port call history, dark periods, risk assessment,
 * and track confidence from the fusion engine.
 */

const TYPE_COLORS: Record<string, string> = {
  Tanker: "#ff3333",
  Cargo: "#00aaff",
  Passenger: "#ffffff",
  Military: "#ff00ff",
  Fishing: "#88ff88",
  Tug: "#44cccc",
  HSC: "#ff8800",
  "Law Enforcement": "#ff00ff",
  Pilot: "#ffff00",
  SAR: "#ff4444",
  Unknown: "#888888",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.Unknown;
}

function formatSpeed(speed: number): string {
  if (speed < 0.5) return "ANCHORED";
  return `${speed.toFixed(1)} kn`;
}

function formatCoord(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(2);
  return `${d}°${m}'${dir}`;
}

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const RISK_COLORS = {
  low: "#00ff41",
  medium: "#ffff00",
  high: "#ff8800",
  critical: "#ff3333",
};

export function VesselPopup() {
  const selectedEntity = useOODAStore((s) => s.selectedEntity);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);

  const [fusedData, setFusedData] = useState<FusedVesselTrack | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEntity || selectedEntity.type !== "vessel") {
      setFusedData(null);
      return;
    }

    const mmsi = selectedEntity.details.mmsi;
    if (!mmsi) return;

    setLoading(true);
    fetch(`/api/maritime/track?mmsi=${mmsi}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setFusedData(data))
      .catch(() => setFusedData(null))
      .finally(() => setLoading(false));
  }, [selectedEntity]);

  if (!selectedEntity || selectedEntity.type !== "vessel") return null;

  const d = selectedEntity.details as Record<string, string | number>;
  const color = getTypeColor(String(d.shipType || "Unknown"));
  const speed = typeof d.speed === "number" ? d.speed : parseFloat(String(d.speed)) || 0;
  const course = typeof d.course === "number" ? d.course : parseFloat(String(d.course)) || 0;
  const isAnchored = speed < 0.5;

  return (
    <div className="absolute bottom-4 left-4 z-50 w-[400px] max-w-[calc(100%-2rem)] max-h-[80vh] overflow-y-auto bg-black/95 border border-green-700/50 backdrop-blur-md shadow-2xl shadow-green-900/20">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b sticky top-0 bg-black/95 z-10"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isAnchored ? "" : "animate-pulse"}`}
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-[10px] tracking-widest" style={{ color }}>
            {String(d.shipType || "VESSEL").toUpperCase()}
          </span>
          {d.flag && (
            <span className="font-mono text-[9px] text-green-600 border border-green-900/30 px-1 flex items-center gap-1">
              {getFlag(String(d.flag)) && (
                <span className="text-sm leading-none">{getFlag(String(d.flag))}</span>
              )}
              {String(d.flag)}
            </span>
          )}
          {/* Risk badge from fusion */}
          {fusedData && fusedData.risk.score > 10 && (
            <span
              className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 border font-bold"
              style={{
                color: RISK_COLORS[fusedData.risk.level],
                borderColor: RISK_COLORS[fusedData.risk.level],
                backgroundColor: `${RISK_COLORS[fusedData.risk.level]}10`,
              }}
            >
              RISK {fusedData.risk.score}
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-green-700 hover:text-green-400 font-mono text-xs transition-colors px-1"
        >
          [X]
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Vessel name */}
        <div>
          <h3 className="font-mono text-sm text-green-300 leading-snug font-bold">
            {selectedEntity.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[9px] text-green-700">
              MMSI: {d.mmsi || "Unknown"}
            </span>
            {fusedData && (
              <span className="font-mono text-[8px] text-green-800">
                {fusedData.totalPositions} positions tracked
              </span>
            )}
          </div>
        </div>

        {/* Speed / Course / Confidence grid */}
        <div className="grid grid-cols-3 gap-2">
          <DataCell
            label="SPEED"
            value={formatSpeed(speed)}
            color={isAnchored ? "#888888" : color}
          />
          <DataCell
            label="COURSE"
            value={`${course.toFixed(0)}°`}
            color="#00ff41"
          />
          <DataCell
            label="CONFIDENCE"
            value={
              fusedData
                ? `${Math.round(fusedData.trackConfidence * 100)}%`
                : loading
                ? "..."
                : "N/A"
            }
            color={
              fusedData
                ? fusedData.trackConfidence > 0.7
                  ? "#00ff41"
                  : fusedData.trackConfidence > 0.3
                  ? "#ffff00"
                  : "#ff3333"
                : "#888888"
            }
          />
        </div>

        {/* Destination */}
        {d.destination && String(d.destination).trim() && (
          <div className="p-2 border border-green-900/30 bg-green-400/5">
            <div className="font-mono text-[7px] text-green-800 tracking-widest mb-0.5">
              DESTINATION
            </div>
            <div className="font-mono text-xs text-green-400">
              {String(d.destination).toUpperCase()}
            </div>
          </div>
        )}

        {/* ── Fused Intelligence ────────────────────── */}
        {loading && (
          <div className="py-2 text-center font-mono text-[9px] text-green-700 animate-pulse">
            FUSING MULTI-SOURCE DATA...
          </div>
        )}

        {fusedData && (
          <>
            {/* Source breakdown */}
            <div className="p-2 border border-green-900/20 bg-green-400/3">
              <div className="font-mono text-[7px] text-green-800 tracking-widest mb-1.5">
                DATA SOURCES
              </div>
              <div className="flex items-center gap-3">
                <SourceBadge label="AIS" count={fusedData.sourceCounts.ais} color="#00ff41" />
                <SourceBadge label="SAT" count={fusedData.sourceCounts.satellite} color="#ff6600" />
                <SourceBadge label="PORT" count={fusedData.sourceCounts.port_inferred} color="#00aaff" />
                <SourceBadge label="INTERP" count={fusedData.sourceCounts.interpolated} color="#ffff00" />
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="font-mono text-[8px] text-green-700">
                  DIST: {fusedData.totalDistanceNm.toFixed(1)} nm
                </span>
                <span className="font-mono text-[8px] text-green-700">
                  AVG: {fusedData.averageSpeedKn.toFixed(1)} kn
                </span>
                <span className="font-mono text-[8px] text-green-700">
                  SINCE: {timeAgo(fusedData.firstSeen)}
                </span>
              </div>
            </div>

            {/* Port calls */}
            {fusedData.portCalls.length > 0 && (
              <div className="p-2 border border-green-900/20 bg-green-400/3">
                <div className="font-mono text-[7px] text-green-800 tracking-widest mb-1.5">
                  PORT CALLS ({fusedData.portCalls.length})
                </div>
                <div className="space-y-1">
                  {fusedData.portCalls.slice(-5).reverse().map((pc, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="font-mono text-[9px] text-green-400">
                          {pc.portName}
                        </span>
                        <span className="font-mono text-[8px] text-green-700">
                          {pc.country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8px] text-green-600">
                          {pc.durationHours.toFixed(1)}h
                        </span>
                        <span className="font-mono text-[8px] text-green-800">
                          {timeAgo(pc.arrived)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dark periods */}
            {fusedData.darkPeriods.length > 0 && (
              <div className="p-2 border border-red-900/20 bg-red-400/3">
                <div className="font-mono text-[7px] text-red-800 tracking-widest mb-1.5">
                  AIS DARK PERIODS ({fusedData.darkPeriods.length})
                </div>
                <div className="space-y-1">
                  {fusedData.darkPeriods.slice(-4).reverse().map((dp, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="font-mono text-[9px] text-red-400">
                          {dp.durationMinutes.toFixed(0)} min dark
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dp.gapDistanceNm != null && (
                          <span className="font-mono text-[8px] text-red-600">
                            {dp.gapDistanceNm.toFixed(1)} nm gap
                          </span>
                        )}
                        <span className="font-mono text-[8px] text-green-800">
                          {timeAgo(dp.start)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk factors */}
            {fusedData.risk.factors.length > 0 && (
              <div
                className="p-2 border"
                style={{
                  borderColor: `${RISK_COLORS[fusedData.risk.level]}20`,
                  backgroundColor: `${RISK_COLORS[fusedData.risk.level]}03`,
                }}
              >
                <div
                  className="font-mono text-[7px] tracking-widest mb-1.5"
                  style={{ color: `${RISK_COLORS[fusedData.risk.level]}80` }}
                >
                  RISK FACTORS ({fusedData.risk.score}/100)
                </div>
                <div className="space-y-1">
                  {fusedData.risk.factors.slice(-5).reverse().map((rf, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0"
                        style={{
                          backgroundColor:
                            rf.severity === "high"
                              ? "#ff3333"
                              : rf.severity === "medium"
                              ? "#ff8800"
                              : "#ffff00",
                        }}
                      />
                      <span className="font-mono text-[8px] text-green-500 leading-relaxed">
                        {rf.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Position + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-green-900/30">
          <div className="font-mono text-[9px] text-green-600">
            {formatCoord(selectedEntity.lat, true)}{" "}
            {formatCoord(selectedEntity.lon, false)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => flyTo(selectedEntity.lon, selectedEntity.lat, 100_000)}
              className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors"
            >
              [ZOOM]
            </button>
            <button
              onClick={() => {
                const info = `${selectedEntity.name} | MMSI: ${d.mmsi} | ${d.shipType} | ${formatSpeed(speed)} | ${formatCoord(selectedEntity.lat, true)} ${formatCoord(selectedEntity.lon, false)}`;
                navigator.clipboard.writeText(info);
              }}
              className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors"
            >
              [COPY]
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setSelectedEntity(null)}
          className="w-full py-1.5 border border-green-900/40 font-mono text-[10px] tracking-wider text-green-700 hover:text-green-400 hover:border-green-700 transition-all"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function DataCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-1.5 border border-green-900/20 bg-green-400/3">
      <div className="font-mono text-[7px] text-green-800 tracking-widest">
        {label}
      </div>
      <div className="font-mono text-xs mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SourceBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: count > 0 ? color : "#333" }}
      />
      <span
        className="font-mono text-[8px]"
        style={{ color: count > 0 ? color : "#555" }}
      >
        {label}: {count}
      </span>
    </div>
  );
}
