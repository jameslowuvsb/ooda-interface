"use client";

import { useOODAStore } from "@/stores/ooda-store";

export function NewsFeed() {
  const news = useOODAStore((s) => s.news);
  const flyTo = useOODAStore((s) => s.flyTo);

  if (news.length === 0) return null;

  // Sort by date, most recent first
  const sorted = [...news].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="text-green-700 font-mono text-[10px] tracking-widest mb-1">
        OBSERVE // NEWS FEED
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {sorted.slice(0, 8).map((article) => {
          const toneColor =
            article.tone < -2
              ? "text-red-400"
              : article.tone > 2
              ? "text-cyan-400"
              : "text-amber-400";

          return (
            <button
              key={article.id}
              onClick={() => flyTo(article.longitude, article.latitude, 1_500_000)}
              className="w-full text-left px-1.5 py-1 border border-green-900/20 hover:border-green-700/40 hover:bg-green-400/5 transition-all block"
            >
              <div className={`font-mono text-[9px] leading-tight ${toneColor}`}>
                {article.title.length > 60
                  ? article.title.slice(0, 57) + "..."
                  : article.title}
              </div>
              <div className="font-mono text-[8px] text-green-800 mt-0.5">
                {article.source}
                {article.tone !== 0 && (
                  <span className="ml-2">
                    TONE: {article.tone > 0 ? "+" : ""}
                    {article.tone.toFixed(1)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
