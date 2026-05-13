"use client";

import { useOODAStore } from "@/stores/ooda-store";
import type { LayerKey } from "@/types";
import { ContainerSearch } from "@/components/hud/ContainerSearch";

const layerConfig: { key: LayerKey; label: string; color: string }[] = [
  { key: "flights", label: "FLIGHTS", color: "#00ff41" },
  { key: "satellites", label: "SATELLITES", color: "#ff6600" },
  { key: "vessels", label: "VESSELS", color: "#00aaff" },
  { key: "earthquakes", label: "SEISMIC", color: "#ffff00" },
  { key: "weather", label: "WEATHER", color: "#8888ff" },
  { key: "news", label: "NEWS/GDELT", color: "#ffaa00" },
];

export function Sidebar() {
  const layers = useOODAStore((s) => s.layers);
  const toggleLayer = useOODAStore((s) => s.toggleLayer);
  const flights = useOODAStore((s) => s.flights);
  const satellites = useOODAStore((s) => s.satellites);
  const vessels = useOODAStore((s) => s.vessels);
  const earthquakes = useOODAStore((s) => s.earthquakes);
  const news = useOODAStore((s) => s.news);

  const counts: Record<LayerKey, number> = {
    flights: flights.length,
    satellites: satellites.length,
    vessels: vessels.length,
    earthquakes: earthquakes.length,
    weather: 0,
    news: news.length,
  };

  return (
    <aside className="w-52 border-r border-green-900/50 bg-black/80 backdrop-blur-sm p-3 flex flex-col gap-2 overflow-y-auto">
      <div className="text-green-700 font-mono text-[10px] tracking-widest mb-1">
        OBSERVE // DATA LAYERS
      </div>

      {layerConfig.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => toggleLayer(key)}
          className={`flex items-center justify-between px-2 py-1.5 border text-xs font-mono tracking-wider transition-all ${
            layers[key]
              ? "border-green-700/60 bg-green-400/5"
              : "border-green-900/30 opacity-40"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: layers[key] ? color : "#333",
              }}
            />
            <span
              style={{
                color: layers[key] ? color : "#555",
              }}
            >
              {label}
            </span>
          </div>
          <span className="text-green-600 text-[10px]">
            {counts[key] > 0 ? counts[key] : "--"}
          </span>
        </button>
      ))}

      <div className="mt-4 border-t border-green-900/30 pt-3">
        <div className="text-green-700 font-mono text-[10px] tracking-widest mb-2">
          CONTAINER TRACKING
        </div>
        <ContainerSearch />
      </div>

      <div className="mt-4 border-t border-green-900/30 pt-3">
        <div className="text-green-700 font-mono text-[10px] tracking-widest mb-2">
          ORIENT // QUICK NAV
        </div>
        <QuickNav />
      </div>
    </aside>
  );
}

const locations = [
  { name: "HORMUZ", lon: 56.3, lat: 26.5 },
  { name: "BAB-EL-MANDEB", lon: 43.3, lat: 12.6 },
  { name: "SUEZ", lon: 32.5, lat: 30.0 },
  { name: "PORT KLANG", lon: 101.39, lat: 2.999 },
  { name: "MALACCA", lon: 101.5, lat: 2.5 },
  { name: "S.CHINA SEA", lon: 114.0, lat: 12.0 },
  { name: "GIBRALTAR", lon: -5.5, lat: 36.0 },
  { name: "CHANNEL", lon: 0.0, lat: 50.5 },
  { name: "TAIWAN", lon: 119.0, lat: 24.0 },
  { name: "PANAMA", lon: -79.5, lat: 9.0 },
  { name: "CAPE", lon: 18.5, lat: -34.3 },
  { name: "GLOBAL", lon: 30, lat: 20 },
];

function QuickNav() {
  const flyTo = useOODAStore((s) => s.flyTo);

  return (
    <div className="flex flex-col gap-1">
      {locations.map((loc) => (
        <button
          key={loc.name}
          onClick={() =>
            flyTo(
              loc.lon,
              loc.lat,
              loc.name === "GLOBAL" ? 20_000_000 : 3_000_000
            )
          }
          className="text-left px-2 py-1 text-[10px] font-mono tracking-wider text-green-600 hover:text-green-400 hover:bg-green-400/5 border border-transparent hover:border-green-900/40 transition-all"
        >
          {loc.name}
        </button>
      ))}
    </div>
  );
}
