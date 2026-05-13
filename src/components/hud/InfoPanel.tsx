"use client";

import { useState } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import { useAISStatus } from "@/hooks/useAISStatus";
import { AlertsPanel } from "./AlertsPanel";
import { NewsFeed } from "./NewsFeed";
import { OODAPanel } from "./OODAPanel";

type CoordFormat = "decimal" | "dms";

function toDMS(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(1);
  return `${d}°${m}'${s}"${dir}`;
}

export function InfoPanel() {
  const cursorPosition = useOODAStore((s) => s.cursorPosition);
  const flights = useOODAStore((s) => s.flights);
  const satellites = useOODAStore((s) => s.satellites);
  const vessels = useOODAStore((s) => s.vessels);
  const earthquakes = useOODAStore((s) => s.earthquakes);
  const news = useOODAStore((s) => s.news);
  const selectedEntity = useOODAStore((s) => s.selectedEntity);

  const [coordFormat, setCoordFormat] = useState<CoordFormat>("decimal");
  const aisStatus = useAISStatus();

  return (
    <aside className="w-72 border-l border-green-900/50 bg-black/80 backdrop-blur-sm p-3 flex flex-col gap-3 overflow-y-auto">
      {/* Cursor Position */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-green-700 font-mono text-[10px] tracking-widest">
            CURSOR
          </span>
          <button
            onClick={() => setCoordFormat(coordFormat === "decimal" ? "dms" : "decimal")}
            className="text-green-800 font-mono text-[8px] tracking-wider hover:text-green-500 transition-colors border border-green-900/30 px-1"
            title="Toggle coordinate format"
          >
            {coordFormat === "decimal" ? "DD" : "DMS"}
          </button>
        </div>
        <div className="font-mono text-xs text-green-500">
          {cursorPosition ? (
            <>
              {coordFormat === "decimal" ? (
                <>
                  <div>LAT {cursorPosition.lat.toFixed(4)}</div>
                  <div>LON {cursorPosition.lon.toFixed(4)}</div>
                </>
              ) : (
                <>
                  <div>LAT {toDMS(cursorPosition.lat, true)}</div>
                  <div>LON {toDMS(cursorPosition.lon, false)}</div>
                </>
              )}
              <div>ALT {(cursorPosition.alt / 1000).toFixed(0)}km</div>
            </>
          ) : (
            <span className="text-green-800">-- NO SIGNAL --</span>
          )}
        </div>
      </div>

      {/* Selected Entity */}
      {selectedEntity && (
        <div className="border border-green-700/40 p-2">
          <div className="text-green-400 font-mono text-[10px] tracking-widest mb-1">
            SELECTED: {selectedEntity.type.toUpperCase()}
          </div>
          <div className="font-mono text-xs text-green-300">
            {selectedEntity.name}
          </div>
          {Object.entries(selectedEntity.details).map(([k, v]) => (
            <div key={k} className="font-mono text-[10px] text-green-600">
              {k}: {v}
            </div>
          ))}
        </div>
      )}

      {/* OBSERVE Status */}
      <div>
        <div className="text-green-700 font-mono text-[10px] tracking-widest mb-1">
          OBSERVE // STATUS
        </div>
        <div className="space-y-1">
          <StatusLine label="FLIGHTS" count={flights.length} color="#00ff41" />
          <StatusLine label="SATELLITES" count={satellites.length} color="#ff6600" />
          <StatusLine
            label="VESSELS"
            count={vessels.length}
            color="#00aaff"
            suffix={aisStatus.connected ? "LIVE" : "SIM"}
            suffixColor={aisStatus.connected ? "#00ff41" : "#ff6600"}
          />
          <StatusLine label="SEISMIC" count={earthquakes.length} color="#ffff00" />
          <StatusLine label="NEWS" count={news.length} color="#ffaa00" />
        </div>
        {/* AIS WebSocket Status */}
        {aisStatus.connected && (
          <div className="mt-1 pt-1 border-t border-green-900/20">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-[8px] text-green-600 tracking-wider">
                AIS STREAM — {aisStatus.regions} REGIONS — {aisStatus.messageCount.toLocaleString()} MSG
              </span>
            </div>
          </div>
        )}
      </div>

      {/* OBSERVE: News Feed */}
      <NewsFeed />

      {/* ORIENT: Threat Analysis */}
      <AlertsPanel />

      {/* DECIDE + ACT: Full OODA Loop */}
      <div className="border-t border-green-900/30 pt-3 flex-1">
        <OODAPanel />
      </div>
    </aside>
  );
}

function StatusLine({
  label,
  count,
  color,
  suffix,
  suffixColor,
}: {
  label: string;
  count: number;
  color: string;
  suffix?: string;
  suffixColor?: string;
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[10px]">
      <span style={{ color }}>{label}</span>
      <div className="flex items-center gap-2">
        {suffix && (
          <span
            style={{ color: suffixColor || color }}
            className="text-[8px] tracking-wider"
          >
            {suffix}
          </span>
        )}
        <span className="text-green-600">{count > 0 ? count : "---"}</span>
      </div>
    </div>
  );
}
