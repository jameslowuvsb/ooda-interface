"use client";

import { useEffect, useRef } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { Earthquake } from "@/types";

const POLL_INTERVAL = 60_000; // 60s — USGS updates roughly every minute

export function useEarthquakes() {
  const setEarthquakes = useOODAStore((s) => s.setEarthquakes);
  const enabled = useOODAStore((s) => s.layers.earthquakes);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchEarthquakes() {
      const id = ++requestId.current;
      try {
        const res = await fetch("/api/earthquakes", {
          signal: controller.signal,
        });
        if (!res.ok || id !== requestId.current) return;
        const data: Earthquake[] = await res.json();
        if (id === requestId.current) setEarthquakes(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Earthquake fetch error:", e);
        }
      }
    }

    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, setEarthquakes]);
}
