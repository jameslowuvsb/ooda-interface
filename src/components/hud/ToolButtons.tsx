"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * Combined tool buttons — keyboard help + range finder + my location.
 * Positioned above the MetricsBar. Only one panel open at a time.
 */

type ActivePanel = null | "shortcuts" | "measure";

const shortcuts = [
  { key: "1-6", desc: "Toggle layers" },
  { key: "E/F/N/C", desc: "View modes" },
  { key: "H", desc: "Fly to Hormuz" },
  { key: "G", desc: "Global view" },
  { key: "ESC", desc: "Deselect" },
  { key: "?", desc: "This help" },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function kmToNm(km: number): number {
  return km * 0.539957;
}

interface MeasurePoint {
  lat: number;
  lon: number;
}

export function ToolButtons() {
  useKeyboardShortcuts();

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [pointA, setPointA] = useState<MeasurePoint | null>(null);
  const cursorPosition = useOODAStore((s) => s.cursorPosition);

  const togglePanel = useCallback(
    (panel: ActivePanel) => {
      if (activePanel === panel) {
        setActivePanel(null);
        if (panel === "measure") setPointA(null);
      } else {
        setActivePanel(panel);
        if (panel !== "measure") setPointA(null);
      }
    },
    [activePanel]
  );

  const handleMeasureClick = useCallback(() => {
    if (activePanel !== "measure" || !cursorPosition) return;
    if (!pointA) {
      setPointA({ lat: cursorPosition.lat, lon: cursorPosition.lon });
    } else {
      setPointA(null);
    }
  }, [activePanel, pointA, cursorPosition]);

  const distance =
    pointA && cursorPosition
      ? haversineKm(pointA.lat, pointA.lon, cursorPosition.lat, cursorPosition.lon)
      : null;

  return (
    <div className="fixed bottom-11 left-3 z-50 flex items-end gap-1.5">
      {/* Keyboard shortcuts button */}
      <div className="relative">
        <button
          onClick={() => togglePanel("shortcuts")}
          className={`w-7 h-7 flex items-center justify-center border font-mono text-xs transition-all bg-black/80 ${
            activePanel === "shortcuts"
              ? "border-green-400 text-green-400 bg-green-400/10"
              : "border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-600"
          }`}
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>

        {activePanel === "shortcuts" && (
          <div className="absolute bottom-9 left-0 bg-black/95 border border-green-700/50 p-3 backdrop-blur-sm">
            <div className="text-green-400 font-mono text-[10px] tracking-widest mb-2">
              KEYBOARD SHORTCUTS
            </div>
            <div className="space-y-1">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-green-400 w-12 text-right">{s.key}</span>
                  <span className="text-green-600">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Range finder button */}
      <div className="relative">
        <button
          onClick={() => togglePanel("measure")}
          className={`w-7 h-7 flex items-center justify-center border font-mono text-xs transition-all bg-black/80 ${
            activePanel === "measure"
              ? "border-green-400 text-green-400 bg-green-400/10"
              : "border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-600"
          }`}
          title="Range finder"
        >
          R
        </button>

        {activePanel === "measure" && (
          <div
            className="absolute bottom-9 left-0 bg-black/95 border border-green-700/50 p-2 backdrop-blur-sm whitespace-nowrap cursor-pointer"
            onClick={handleMeasureClick}
          >
            <div className="text-green-400 font-mono text-[10px] tracking-widest mb-1">
              RANGE FINDER
            </div>
            {!pointA ? (
              <div className="font-mono text-[10px] text-green-600">
                Click globe to set point A
              </div>
            ) : distance !== null ? (
              <div className="space-y-0.5">
                <div className="font-mono text-[10px] text-green-500">
                  A: {pointA.lat.toFixed(4)}, {pointA.lon.toFixed(4)}
                </div>
                <div className="font-mono text-[10px] text-green-500">
                  B: {cursorPosition!.lat.toFixed(4)}, {cursorPosition!.lon.toFixed(4)}
                </div>
                <div className="font-mono text-xs text-green-400 font-bold mt-1">
                  {distance.toFixed(1)} km / {kmToNm(distance).toFixed(1)} nm
                </div>
                <div className="font-mono text-[8px] text-green-700 mt-1">
                  Click globe to reset
                </div>
              </div>
            ) : (
              <div className="font-mono text-[10px] text-green-600">
                Move cursor to measure
              </div>
            )}
          </div>
        )}
      </div>

      {/* My location button */}
      <MyLocationButton />
    </div>
  );
}

// ── My Location Button ─────────────────────────────────────

function MyLocationButton() {
  const flyTo = useOODAStore((s) => s.flyTo);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (!navigator.geolocation) {
      setError("NO GPS");
      setTimeout(() => setError(null), 2000);
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.longitude, pos.coords.latitude, 500_000);
        setLocating(false);
      },
      () => {
        setError("DENIED");
        setLocating(false);
        setTimeout(() => setError(null), 2000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [flyTo]);

  return (
    <button
      onClick={handleClick}
      disabled={locating}
      className={`w-7 h-7 flex items-center justify-center border font-mono text-xs transition-all bg-black/80 ${
        locating
          ? "border-blue-400 text-blue-400 bg-blue-400/10 animate-pulse"
          : error
          ? "border-red-700 text-red-500"
          : "border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-600"
      }`}
      title={error || "My location"}
    >
      {locating ? "..." : error ? "!" : "⌖"}
    </button>
  );
}

// ── Scale Bar ──────────────────────────────────────────────

// Nice round numbers for scale bar labels
const SCALE_STEPS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000,
];

function ScaleBar() {
  const viewer = useOODAStore((s) => s.viewer);
  const [scaleLabel, setScaleLabel] = useState("100 km");
  const [barWidth, setBarWidth] = useState(80);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    function update() {
      if (!viewer || viewer.isDestroyed()) return;

      try {
        const canvas = viewer.scene.canvas;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Pick two points on the globe: center-left and center-right of the screen
        // Use a 100px baseline at the bottom of the viewport
        const TARGET_PX = 100;
        const y = h - 50;
        const x1 = w / 2 - TARGET_PX / 2;
        const x2 = w / 2 + TARGET_PX / 2;

        const left = viewer.camera.pickEllipsoid(
          new Cesium.Cartesian2(x1, y),
          viewer.scene.globe.ellipsoid
        );
        const right = viewer.camera.pickEllipsoid(
          new Cesium.Cartesian2(x2, y),
          viewer.scene.globe.ellipsoid
        );

        if (!left || !right) {
          rafRef.current = requestAnimationFrame(update);
          return;
        }

        const leftCarto = viewer.scene.globe.ellipsoid.cartesianToCartographic(left);
        const rightCarto = viewer.scene.globe.ellipsoid.cartesianToCartographic(right);

        const lat1 = leftCarto.latitude * (180 / Math.PI);
        const lon1 = leftCarto.longitude * (180 / Math.PI);
        const lat2 = rightCarto.latitude * (180 / Math.PI);
        const lon2 = rightCarto.longitude * (180 / Math.PI);

        // Distance in km for the TARGET_PX pixel span
        const kmPerPx = haversineKm(lat1, lon1, lat2, lon2) / TARGET_PX;

        if (kmPerPx <= 0 || !isFinite(kmPerPx)) {
          rafRef.current = requestAnimationFrame(update);
          return;
        }

        // Find the best round-number scale that fits in 60-150px
        let bestStep = SCALE_STEPS[0];
        for (const step of SCALE_STEPS) {
          const px = step / kmPerPx;
          if (px >= 50 && px <= 160) {
            bestStep = step;
            break;
          }
          if (px > 160) break;
          bestStep = step;
        }

        const pxWidth = Math.round(bestStep / kmPerPx);
        const clampedWidth = Math.max(30, Math.min(pxWidth, 180));

        const label = bestStep >= 1000
          ? `${(bestStep / 1000).toLocaleString()}k km`
          : `${bestStep} km`;

        setScaleLabel(label);
        setBarWidth(clampedWidth);
      } catch {
        // Ignore errors during camera transitions
      }

      rafRef.current = requestAnimationFrame(update);
    }

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [viewer]);

  return (
    <div className="fixed bottom-11 right-3 z-50 flex flex-col items-end pointer-events-none">
      <span className="font-mono text-[9px] text-green-500 tracking-wider mb-0.5">
        {scaleLabel}
      </span>
      <div
        className="h-[3px] border-l border-r border-b border-green-500/80"
        style={{ width: barWidth }}
      />
    </div>
  );
}
