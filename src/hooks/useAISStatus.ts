"use client";

import { useEffect, useState } from "react";

interface AISStats {
  connected: boolean;
  vesselCount: number;
  messageCount: number;
  lastMessageTime: number;
  regions: number;
}

const DEFAULT_STATS: AISStats = {
  connected: false,
  vesselCount: 0,
  messageCount: 0,
  lastMessageTime: 0,
  regions: 0,
};

export function useAISStatus() {
  const [stats, setStats] = useState<AISStats>(DEFAULT_STATS);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/vessels/stats", {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Silent fail
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30_000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return stats;
}
