"use client";

import { useEffect, useRef } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { Satellite } from "@/types";

const POLL_INTERVAL = 30_000; // 30s — satellite positions change slowly

export function useSatellites() {
  const setSatellites = useOODAStore((s) => s.setSatellites);
  const enabled = useOODAStore((s) => s.layers.satellites);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchSatellites() {
      const id = ++requestId.current;
      try {
        const res = await fetch("/api/satellites", {
          signal: controller.signal,
        });
        if (!res.ok || id !== requestId.current) return;
        const data: Satellite[] = await res.json();
        if (id === requestId.current) setSatellites(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Satellite fetch error:", e);
        }
      }
    }

    fetchSatellites();
    const interval = setInterval(fetchSatellites, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, setSatellites]);
}
