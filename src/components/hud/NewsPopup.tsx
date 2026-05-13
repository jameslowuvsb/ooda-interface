"use client";

import { useOODAStore } from "@/stores/ooda-store";

/**
 * Rich news detail popup — appears when a news entity is clicked on the globe.
 * Shows headline, source, image, location, tone, and link to original article.
 * Styled like a tactical intelligence card.
 */
export function NewsPopup() {
  const selectedEntity = useOODAStore((s) => s.selectedEntity);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);

  if (!selectedEntity || selectedEntity.type !== "news") return null;

  const {
    title,
    source,
    url,
    tone,
    date,
    imageUrl,
  } = selectedEntity.details as Record<string, string | number>;

  const toneNum = typeof tone === "number" ? tone : parseFloat(String(tone)) || 0;
  const toneLabel =
    toneNum < -5
      ? "VERY NEGATIVE"
      : toneNum < -2
      ? "NEGATIVE"
      : toneNum > 5
      ? "VERY POSITIVE"
      : toneNum > 2
      ? "POSITIVE"
      : "NEUTRAL";
  const toneColor =
    toneNum < -2 ? "#ff4444" : toneNum > 2 ? "#00cccc" : "#ffaa00";

  const dateStr = date
    ? new Date(String(date)).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

  return (
    <div className="absolute bottom-4 left-4 z-50 w-[420px] max-w-[calc(100%-2rem)] bg-black/95 border border-green-700/50 backdrop-blur-md shadow-2xl shadow-green-900/20">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-900/40 bg-green-400/5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: toneColor }}
          />
          <span className="font-mono text-[10px] tracking-widest text-green-500">
            NEWS INTEL
          </span>
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-green-700 hover:text-green-400 font-mono text-xs transition-colors px-1"
        >
          [X]
        </button>
      </div>

      {/* Image */}
      {imageUrl && String(imageUrl).startsWith("http") && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={String(imageUrl)}
            alt=""
            className="w-full h-full object-cover opacity-80"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {/* Source badge on image */}
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 border border-green-900/50">
            <span className="font-mono text-[9px] text-green-400 tracking-wider">
              {String(source).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Title */}
        <h3 className="font-mono text-sm text-green-300 leading-snug">
          {String(title)}
        </h3>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!imageUrl || !String(imageUrl).startsWith("http") ? (
              <span className="font-mono text-[9px] text-green-600 tracking-wider">
                {String(source).toUpperCase()}
              </span>
            ) : null}
            <span className="font-mono text-[9px] text-green-800">
              {dateStr}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 border"
              style={{
                color: toneColor,
                borderColor: `${toneColor}40`,
                backgroundColor: `${toneColor}10`,
              }}
            >
              {toneLabel} ({toneNum > 0 ? "+" : ""}{toneNum.toFixed(1)})
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center justify-between pt-2 border-t border-green-900/30">
          <div className="font-mono text-[9px] text-green-600">
            <span className="text-green-800">LAT</span> {selectedEntity.lat.toFixed(4)}{" "}
            <span className="text-green-800 ml-2">LON</span> {selectedEntity.lon.toFixed(4)}
          </div>
          <button
            onClick={() => flyTo(selectedEntity.lon, selectedEntity.lat, 500_000)}
            className="font-mono text-[9px] text-green-500 hover:text-green-300 tracking-wider transition-colors"
          >
            [ZOOM IN]
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {url && String(url).startsWith("http") && (
            <a
              href={String(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 border border-green-700/40 font-mono text-[10px] tracking-wider text-green-400 hover:bg-green-400/10 hover:border-green-600 transition-all"
            >
              READ FULL ARTICLE
            </a>
          )}
          <button
            onClick={() => setSelectedEntity(null)}
            className="px-3 py-1.5 border border-green-900/40 font-mono text-[10px] tracking-wider text-green-700 hover:text-green-400 hover:border-green-700 transition-all"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
