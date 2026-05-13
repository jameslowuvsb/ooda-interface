"use client";

import { useEffect, useState } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import { codeToFlag, getSatelliteCountry } from "@/lib/flags";

/**
 * Rich satellite detail card — appears when a satellite entity is clicked.
 * Shows name, NORAD ID, altitude, velocity, position, orbital info,
 * country flag, and a profile image fetched from Wikipedia.
 */

interface SatelliteImage {
  imageUrl: string | null;
  description: string | null;
  wikiTitle: string | null;
  wikiUrl: string | null;
}

const imageCache = new Map<string, SatelliteImage>();

function formatCoord(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(3);
  return `${d}°${m}'${dir}`;
}

export function SatellitePopup() {
  const selectedEntity = useOODAStore((s) => s.selectedEntity);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);
  const [imageData, setImageData] = useState<SatelliteImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const isSatellite = selectedEntity?.type === "satellite";
  const d = isSatellite
    ? (selectedEntity.details as Record<string, string | number>)
    : null;

  // Fetch Wikipedia image when satellite is selected
  useEffect(() => {
    if (!isSatellite || !d) {
      setImageData(null);
      return;
    }

    const name = String(d.name || selectedEntity!.name || "");
    const id = String(d.id || "");
    const cacheKey = `${id}:${name}`;

    // Client-side cache
    if (imageCache.has(cacheKey)) {
      setImageData(imageCache.get(cacheKey)!);
      return;
    }

    setImageLoading(true);
    const controller = new AbortController();

    fetch(
      `/api/satellites/image?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SatelliteImage | null) => {
        if (data) {
          imageCache.set(cacheKey, data);
          setImageData(data);
        }
      })
      .catch(() => {})
      .finally(() => setImageLoading(false));

    return () => controller.abort();
  }, [isSatellite, selectedEntity?.id]);

  if (!isSatellite || !d) return null;

  const altitude = typeof d.altitude === "number" ? d.altitude : parseFloat(String(d.altitude)) || 0;
  const velocity = typeof d.velocity === "number" ? d.velocity : parseFloat(String(d.velocity)) || 0;
  const category = String(d.category || "unknown");

  const countryCode = getSatelliteCountry(selectedEntity.name);
  const countryFlag = countryCode ? codeToFlag(countryCode) : "";

  // Orbital classification
  const orbitType =
    altitude < 2000
      ? "LEO"
      : altitude < 20200
      ? "MEO"
      : altitude < 36000
      ? "GEO TRANSFER"
      : "GEO";

  // Orbital period approximation (Kepler's 3rd law)
  const earthRadius = 6371; // km
  const semiMajor = earthRadius + altitude;
  const periodMin = (2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / 398600.4418)) / 60;

  return (
    <div className="absolute bottom-4 left-4 z-50 w-[380px] max-w-[calc(100%-2rem)] bg-black/95 border border-orange-700/50 backdrop-blur-md shadow-2xl shadow-orange-900/20">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-700/30 bg-orange-400/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-orange-400">
            SATELLITE
          </span>
          <span className="font-mono text-[9px] text-orange-700 border border-orange-900/30 px-1">
            {orbitType}
          </span>
          {countryFlag && (
            <span className="font-mono text-[9px] text-orange-600 border border-orange-900/30 px-1 flex items-center gap-1">
              <span className="text-sm leading-none">{countryFlag}</span>
              {countryCode}
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-orange-700 hover:text-orange-400 font-mono text-xs transition-colors px-1"
        >
          [X]
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Image + Name row */}
        <div className="flex gap-3">
          {/* Wikipedia image */}
          <div className="w-24 h-24 shrink-0 border border-orange-900/30 bg-black/50 overflow-hidden flex items-center justify-center">
            {imageLoading ? (
              <div className="font-mono text-[8px] text-orange-800 animate-pulse">
                LOADING...
              </div>
            ) : imageData?.imageUrl ? (
              <img
                src={imageData.imageUrl}
                alt={selectedEntity.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="text-center px-1">
                <div className="font-mono text-lg text-orange-800">&#x1F6F0;</div>
                <div className="font-mono text-[7px] text-orange-900 mt-1">
                  NO IMAGE
                </div>
              </div>
            )}
          </div>

          {/* Name + IDs */}
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm text-orange-300 leading-snug truncate">
              {selectedEntity.name}
            </h3>
            <div className="font-mono text-[9px] text-orange-700 mt-0.5">
              NORAD ID: {d.id || "Unknown"}
            </div>
            <div className="font-mono text-[9px] text-orange-700">
              CATEGORY: {category.toUpperCase()}
            </div>
            {imageData?.wikiTitle && (
              <a
                href={imageData.wikiUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8px] text-cyan-600 hover:text-cyan-400 transition-colors mt-1 inline-block"
              >
                [{imageData.wikiTitle}] ↗
              </a>
            )}
          </div>
        </div>

        {/* Wikipedia description */}
        {imageData?.description && (
          <div className="font-mono text-[9px] text-orange-500/80 leading-relaxed line-clamp-3 border-l-2 border-orange-900/30 pl-2">
            {imageData.description}
          </div>
        )}

        {/* Orbital data grid */}
        <div className="grid grid-cols-3 gap-2">
          <DataCell
            label="ALTITUDE"
            value={`${altitude.toFixed(1)} km`}
            color="#ff8800"
          />
          <DataCell
            label="VELOCITY"
            value={`${velocity.toFixed(2)} km/s`}
            color="#ff6600"
          />
          <DataCell
            label="PERIOD"
            value={`${periodMin.toFixed(1)} min`}
            color="#ff6600"
          />
        </div>

        {/* Position */}
        <div className="flex items-center justify-between pt-2 border-t border-orange-900/30">
          <div className="font-mono text-[9px] text-orange-600">
            {formatCoord(selectedEntity.lat, true)}{" "}
            {formatCoord(selectedEntity.lon, false)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => flyTo(selectedEntity.lon, selectedEntity.lat, 2_000_000)}
              className="font-mono text-[9px] text-orange-500 hover:text-orange-300 tracking-wider transition-colors"
            >
              [TRACK]
            </button>
            <button
              onClick={() => {
                const info = `${selectedEntity.name} | NORAD: ${d.id} | Alt: ${altitude.toFixed(1)}km | Vel: ${velocity.toFixed(2)}km/s | ${formatCoord(selectedEntity.lat, true)} ${formatCoord(selectedEntity.lon, false)}`;
                navigator.clipboard.writeText(info);
              }}
              className="font-mono text-[9px] text-orange-500 hover:text-orange-300 tracking-wider transition-colors"
            >
              [COPY]
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setSelectedEntity(null)}
          className="w-full py-1.5 border border-orange-900/40 font-mono text-[10px] tracking-wider text-orange-700 hover:text-orange-400 hover:border-orange-700 transition-all"
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
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-1.5 border border-orange-900/20 bg-orange-400/3">
      <div className="font-mono text-[7px] text-orange-800 tracking-widest">
        {label}
      </div>
      <div className="font-mono text-xs mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
