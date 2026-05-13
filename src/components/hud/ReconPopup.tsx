"use client";

import { useState, useEffect } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import { codeToFlag } from "@/lib/flags";
import { getCategoryMeta } from "@/lib/recon-sites";
import type { ReconSite } from "@/lib/recon-sites";

/**
 * ReconPopup — OSINT area of interest detail card.
 * Shows site info, category, country, significance,
 * and a live satellite image from NASA GIBS.
 */

function formatCoord(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(2);
  return `${d}°${m}'${dir}`;
}

export function ReconPopup() {
  const selectedEntity = useOODAStore((s) => s.selectedEntity);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const entity = selectedEntity;
  const isRecon = entity?.type === "recon";

  useEffect(() => {
    if (!isRecon || !entity) {
      setImageUrl(null);
      setImageError(false);
      return;
    }

    setImageLoading(true);
    setImageError(false);

    // Determine span based on zoom altitude
    const zoomAlt = Number(entity.details.zoomAlt) || 10000;
    const span = Math.max(0.1, Math.min(zoomAlt / 25000, 2.0));

    const url = `/api/recon/imagery?lat=${entity.lat}&lon=${entity.lon}&span=${span}&w=600&h=360`;
    setImageUrl(url);
    setImageLoading(false);
  }, [isRecon, entity]);

  if (!isRecon || !entity) return null;

  const d = entity.details as Record<string, string | number>;
  const category = String(d.category || "military") as ReconSite["category"];
  const meta = getCategoryMeta(category);
  const countryCode = String(d.countryCode || "");
  const flag = countryCode ? codeToFlag(countryCode) : "";
  const zoomAlt = Number(d.zoomAlt) || 10000;

  const worldviewUrl = `https://worldview.earthdata.nasa.gov/?v=${(
    entity.lon - 1
  ).toFixed(2)},${(entity.lat - 0.7).toFixed(2)},${(entity.lon + 1).toFixed(
    2
  )},${(entity.lat + 0.7).toFixed(
    2
  )}&l=VIIRS_SNPP_CorrectedReflectance_TrueColor,Coastlines_15m`;

  const sentinelUrl = `https://apps.sentinel-hub.com/eo-browser/?zoom=14&lat=${entity.lat}&lng=${entity.lon}&themeId=DEFAULT-THEME&visualizationUrl=https://services.sentinel-hub.com/ogc/wms/bd86bcc0-f318-402b-a145-015f85b9427e&datasetId=S2L2A&fromTime=2024-01-01T00:00:00.000Z&toTime=${new Date().toISOString().slice(0, 10)}T23:59:59.999Z&layerId=1_TRUE_COLOR`;

  return (
    <div className="absolute bottom-4 left-4 z-50 w-[420px] max-w-[calc(100%-2rem)] bg-black/95 border backdrop-blur-md shadow-2xl"
      style={{ borderColor: `${meta.color}50` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: `${meta.color}30`,
          backgroundColor: `${meta.color}08`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: meta.color }}
          />
          <span
            className="font-mono text-[10px] tracking-widest"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
          <span className="font-mono text-[9px] text-green-600 border border-green-900/30 px-1">
            RECON
          </span>
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
        {/* Site name + country */}
        <div className="flex items-center gap-3">
          {flag && (
            <div className="text-2xl leading-none shrink-0">{flag}</div>
          )}
          <div className="min-w-0">
            <h3 className="font-mono text-sm text-green-300 leading-snug font-bold">
              {entity.name}
            </h3>
            <div className="font-mono text-[9px] text-green-600 mt-0.5">
              {String(d.country || "")}
            </div>
          </div>
        </div>

        {/* Satellite imagery */}
        <div
          className="relative w-full border overflow-hidden"
          style={{
            borderColor: `${meta.color}30`,
            aspectRatio: "5/3",
          }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <span className="font-mono text-[10px] text-green-600 animate-pulse">
                ACQUIRING IMAGERY...
              </span>
            </div>
          )}
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={`Satellite view of ${entity.name}`}
              className="w-full h-full object-cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-1">
              <span className="font-mono text-[10px] text-red-500">
                IMAGERY UNAVAILABLE
              </span>
              <span className="font-mono text-[8px] text-green-800">
                Cloud cover or processing delay
              </span>
            </div>
          ) : null}

          {/* Imagery overlay info */}
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/70 flex items-center justify-between">
            <span className="font-mono text-[8px] text-green-700">
              NASA GIBS / VIIRS
            </span>
            <span className="font-mono text-[8px] text-green-700">
              {formatCoord(entity.lat, true)} {formatCoord(entity.lon, false)}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] text-green-400 leading-relaxed">
            {String(d.description || "")}
          </p>
          <div className="p-2 border border-green-900/20 bg-green-400/3">
            <div className="font-mono text-[7px] text-green-800 tracking-widest mb-1">
              OSINT SIGNIFICANCE
            </div>
            <p className="font-mono text-[9px] text-green-500 leading-relaxed">
              {String(d.significance || "")}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-green-900/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => flyTo(entity.lon, entity.lat, zoomAlt)}
              className="font-mono text-[9px] tracking-wider transition-colors px-2 py-1 border"
              style={{
                color: meta.color,
                borderColor: `${meta.color}40`,
              }}
            >
              [FLY TO]
            </button>
            <a
              href={worldviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors px-2 py-1 border border-green-900/30"
            >
              [NASA WORLDVIEW]
            </a>
            <a
              href={sentinelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors px-2 py-1 border border-green-900/30"
            >
              [SENTINEL-2]
            </a>
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
