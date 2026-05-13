"use client";

import { useEffect, useRef } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { Vessel } from "@/types";

const POLL_INTERVAL = 30_000; // 30s — AIS updates every few seconds but we batch

export function useVessels() {
  const setVessels = useOODAStore((s) => s.setVessels);
  const enabled = useOODAStore((s) => s.layers.vessels);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchVessels() {
      const id = ++requestId.current;
      try {
        const res = await fetch("/api/vessels", {
          signal: controller.signal,
        });
        if (!res.ok || id !== requestId.current) return;
        const data: Vessel[] = await res.json();
        if (id === requestId.current) setVessels(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Vessel fetch error:", e);
        }
      }
    }

    fetchVessels();
    const interval = setInterval(fetchVessels, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, setVessels]);
}
