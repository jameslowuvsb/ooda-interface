"use client";

import { useEffect, useRef } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { Flight } from "@/types";

const POLL_INTERVAL = 30_000; // 30s — 10 parallel region queries per poll

export function useFlights() {
  const setFlights = useOODAStore((s) => s.setFlights);
  const enabled = useOODAStore((s) => s.layers.flights);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchFlights() {
      const id = ++requestId.current;
      try {
        const res = await fetch("/api/flights", {
          signal: controller.signal,
        });
        if (!res.ok || id !== requestId.current) return;
        const data: Flight[] = await res.json();
        if (id === requestId.current) setFlights(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Flight fetch error:", e);
        }
      }
    }

    fetchFlights();
    const interval = setInterval(fetchFlights, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, setFlights]);
}
