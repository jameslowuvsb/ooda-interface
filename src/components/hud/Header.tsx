"use client";

import { useState, useEffect, useCallback } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { ViewMode } from "@/types";

const viewModes: { key: ViewMode; label: string }[] = [
  { key: "eo", label: "EO" },
  { key: "flir", label: "FLIR" },
  { key: "nightvision", label: "NV" },
  { key: "crt", label: "CRT" },
];

export function Header() {
  const viewMode = useOODAStore((s) => s.viewMode);
  const setViewMode = useOODAStore((s) => s.setViewMode);

  return (
    <header className="h-10 flex items-center justify-between px-4 border-b border-green-900/50 bg-black/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-green-400 font-mono text-sm font-bold tracking-widest hud-glow">
          OODA
        </span>
        <span className="text-green-700 font-mono text-[10px] tracking-wide hidden md:inline">
          OBSERVE / ORIENT / DECIDE / ACT
        </span>
      </div>

      <SearchBox />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`px-2 py-0.5 text-[10px] font-mono tracking-wider border transition-all ${
                viewMode === mode.key
                  ? "border-green-400 text-green-400 bg-green-400/10"
                  : "border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-700"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <SettingsButton />
        <LiveClock />
      </div>
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function update() {
      setTime(new Date().toISOString().slice(11, 19) + "Z");
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-xs text-green-600 tabular-nums">
      {time}
    </span>
  );
}

function SettingsButton() {
  const setSettingsOpen = useOODAStore((s) => s.setSettingsOpen);

  return (
    <button
      onClick={() => setSettingsOpen(true)}
      className="px-2 py-0.5 text-[10px] font-mono tracking-wider border border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-700 transition-all"
      title="Settings — API Keys"
    >
      CFG
    </button>
  );
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const flyTo = useOODAStore((s) => s.flyTo);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      try {
        // Nominatim geocoder (free, no key)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&limit=1`,
          {
            headers: { "User-Agent": "OODA-Interface/1.0" },
          }
        );
        const data = await res.json();
        if (data.length > 0) {
          flyTo(parseFloat(data[0].lon), parseFloat(data[0].lat), 1_000_000);
          setQuery("");
        }
      } catch (err) {
        console.error("Geocode error:", err);
      }
    },
    [query, flyTo]
  );

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SEARCH LOCATION..."
        className="bg-transparent border border-green-900/50 px-2 py-0.5 text-[10px] font-mono text-green-400 placeholder-green-800 tracking-wider w-48 focus:outline-none focus:border-green-600 transition-colors"
      />
    </form>
  );
}
