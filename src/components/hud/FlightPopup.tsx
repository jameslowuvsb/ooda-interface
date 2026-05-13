"use client";

import { useOODAStore } from "@/stores/ooda-store";
import { codeToFlag } from "@/lib/flags";

/**
 * Rich flight detail card — appears when an aircraft entity is clicked.
 * Shows callsign, ICAO24, origin country with flag, altitude, speed,
 * heading, squawk, and vertical rate.
 */

function formatCoord(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(3);
  return `${d}°${m}'${dir}`;
}

function formatAltitude(ft: number | null | undefined): string {
  if (ft == null) return "---";
  return `FL${Math.round(ft / 100).toString().padStart(3, "0")}`;
}

function formatSpeed(kts: number | null | undefined): string {
  if (kts == null) return "---";
  return `${Math.round(kts)} kts`;
}

function formatHeading(deg: number | null | undefined): string {
  if (deg == null) return "---";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return `${Math.round(deg)}° ${dirs[Math.round(deg / 22.5) % 16]}`;
}

function formatVertRate(fpm: number | null | undefined): string {
  if (fpm == null) return "---";
  if (Math.abs(fpm) < 50) return "LEVEL";
  return `${fpm > 0 ? "+" : ""}${Math.round(fpm)} ft/m`;
}

// Squawk code meanings
function getSquawkInfo(squawk: string | null | undefined): { label: string; color: string } | null {
  if (!squawk) return null;
  switch (squawk) {
    case "7500": return { label: "HIJACK", color: "#ff0000" };
    case "7600": return { label: "RADIO FAIL", color: "#ff8800" };
    case "7700": return { label: "EMERGENCY", color: "#ff0000" };
    default: return null;
  }
}

export function FlightPopup() {
  const selectedEntity = useOODAStore((s) => s.selectedEntity);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);

  if (!selectedEntity || selectedEntity.type !== "flight") return null;

  const d = selectedEntity.details as Record<string, string | number>;
  const callsign = String(d.callsign || selectedEntity.name || "Unknown").trim();
  const icao24 = String(d.icao24 || "");
  const originCountry = String(d.originCountry || "");
  const registration = String(d.registration || "");
  const aircraftType = String(d.aircraftType || "");
  const baroAlt = d.baroAltitude != null ? Number(d.baroAltitude) : null;
  const geoAlt = d.geoAltitude != null ? Number(d.geoAltitude) : null;
  const velocity = d.velocity != null ? Number(d.velocity) : null;
  const track = d.trueTrack != null ? Number(d.trueTrack) : null;
  const vertRate = d.verticalRate != null ? Number(d.verticalRate) : null;
  const squawk = d.squawk ? String(d.squawk) : null;
  const onGround = String(d.onGround) === "true" || d.onGround === 1;

  // originCountry is now a 2-letter ISO code derived from ICAO hex
  const flag = originCountry ? codeToFlag(originCountry) : "";
  const squawkInfo = getSquawkInfo(squawk);

  // Flight phase
  const phase = onGround
    ? "ON GROUND"
    : vertRate != null && vertRate > 300
    ? "CLIMBING"
    : vertRate != null && vertRate < -300
    ? "DESCENDING"
    : "CRUISE";

  const phaseColor = onGround
    ? "#888888"
    : phase === "CLIMBING"
    ? "#00ff41"
    : phase === "DESCENDING"
    ? "#ffff00"
    : "#00aaff";

  return (
    <div className="absolute bottom-4 left-4 z-50 w-[380px] max-w-[calc(100%-2rem)] bg-black/95 border border-green-700/50 backdrop-blur-md shadow-2xl shadow-green-900/20">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-700/30 bg-green-400/5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${onGround ? "" : "animate-pulse"}`}
            style={{ backgroundColor: phaseColor }}
          />
          <span className="font-mono text-[10px] tracking-widest text-green-400">
            AIRCRAFT
          </span>
          {squawkInfo && (
            <span
              className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 border animate-pulse font-bold"
              style={{
                color: squawkInfo.color,
                borderColor: squawkInfo.color,
                backgroundColor: `${squawkInfo.color}15`,
              }}
            >
              {squawkInfo.label}
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
        {/* Callsign + country */}
        <div className="flex items-center gap-3">
          {/* Flag */}
          {flag && (
            <div className="text-3xl leading-none shrink-0" title={originCountry}>
              {flag}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-mono text-lg text-green-300 leading-snug font-bold tracking-wider">
              {callsign || "NO CALLSIGN"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-[9px] text-green-700">
                ICAO: {icao24.toUpperCase()}
              </span>
              {registration && registration !== "TWR" && registration !== "GND" && (
                <span className="font-mono text-[9px] text-green-600 border border-green-900/30 px-1">
                  {registration}
                </span>
              )}
              {originCountry && (
                <span className="font-mono text-[9px] text-green-600 border border-green-900/30 px-1">
                  {originCountry}
                </span>
              )}
            </div>
            {aircraftType && (
              <div className="font-mono text-[8px] text-green-700 mt-0.5">
                {aircraftType}
              </div>
            )}
          </div>
        </div>

        {/* Flight data grid */}
        <div className="grid grid-cols-3 gap-2">
          <DataCell
            label="ALTITUDE"
            value={formatAltitude(baroAlt)}
            sub={geoAlt != null ? `GEO: ${Math.round(geoAlt)}ft` : undefined}
            color="#00ff41"
          />
          <DataCell
            label="SPEED"
            value={formatSpeed(velocity)}
            color="#00aaff"
          />
          <DataCell
            label="HEADING"
            value={formatHeading(track)}
            color="#00ff41"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <DataCell
            label="VERT RATE"
            value={formatVertRate(vertRate)}
            color={
              vertRate != null && vertRate > 300
                ? "#00ff41"
                : vertRate != null && vertRate < -300
                ? "#ffff00"
                : "#888888"
            }
          />
          <DataCell
            label="SQUAWK"
            value={squawk || "---"}
            color={squawkInfo ? squawkInfo.color : "#00ff41"}
          />
          <DataCell
            label="PHASE"
            value={phase}
            color={phaseColor}
          />
        </div>

        {/* Position */}
        <div className="flex items-center justify-between pt-2 border-t border-green-900/30">
          <div className="font-mono text-[9px] text-green-600">
            {formatCoord(selectedEntity.lat, true)}{" "}
            {formatCoord(selectedEntity.lon, false)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => flyTo(selectedEntity.lon, selectedEntity.lat, 500_000)}
              className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors"
            >
              [TRACK]
            </button>
            <button
              onClick={() => {
                const info = `${callsign} | ICAO: ${icao24} | ${originCountry} | ${formatAltitude(baroAlt)} | ${formatSpeed(velocity)} | ${formatCoord(selectedEntity.lat, true)} ${formatCoord(selectedEntity.lon, false)}`;
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

function DataCell({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
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
      {sub && (
        <div className="font-mono text-[7px] text-green-800 mt-0.5">{sub}</div>
      )}
    </div>
  );
}
