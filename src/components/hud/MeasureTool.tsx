"use client";

import { useState, useCallback } from "react";
import { useOODAStore } from "@/stores/ooda-store";

/**
 * Distance measurement between two points
 * Uses haversine formula — same as the dark ship detector
 */
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

function kmToNm(km: number): number {
  return km * 0.539957;
}

interface MeasurePoint {
  lat: number;
  lon: number;
}

export function MeasureTool() {
  const [active, setActive] = useState(false);
  const [pointA, setPointA] = useState<MeasurePoint | null>(null);
  const cursorPosition = useOODAStore((s) => s.cursorPosition);

  const handleClick = useCallback(() => {
    if (!active || !cursorPosition) return;

    if (!pointA) {
      setPointA({ lat: cursorPosition.lat, lon: cursorPosition.lon });
    } else {
      // Second click — measurement complete, reset
      setPointA(null);
    }
  }, [active, pointA, cursorPosition]);

  const distance =
    pointA && cursorPosition
      ? haversineKm(pointA.lat, pointA.lon, cursorPosition.lat, cursorPosition.lon)
      : null;

  return (
    <div className="fixed bottom-3 left-12 z-50">
      <button
        onClick={() => {
          setActive(!active);
          setPointA(null);
        }}
        className={`w-6 h-6 flex items-center justify-center border font-mono text-xs transition-all bg-black/80 ${
          active
            ? "border-green-400 text-green-400 bg-green-400/10"
            : "border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-600"
        }`}
        title="Measure distance (click two points)"
      >
        R
      </button>

      {active && (
        <div
          className="absolute bottom-8 left-0 bg-black/95 border border-green-700/50 p-2 backdrop-blur-sm whitespace-nowrap cursor-pointer"
          onClick={handleClick}
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
  );
}
