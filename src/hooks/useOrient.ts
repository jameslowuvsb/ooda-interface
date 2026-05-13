"use client";

import { useEffect, useState } from "react";
import type { DarkShipAlert } from "@/lib/orient/dark-ship-detector";

const POLL_INTERVAL = 30_000;

interface OrientData {
  alerts: DarkShipAlert[];
  vesselCount: number;
  summary: {
    aisGaps: number;
    speedAnomalies: number;
    stsZoneAlerts: number;
    headingMismatches: number;
  };
}

export function useOrient() {
  const [data, setData] = useState<OrientData>({
    alerts: [],
    vesselCount: 0,
    summary: { aisGaps: 0, speedAnomalies: 0, stsZoneAlerts: 0, headingMismatches: 0 },
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOrient() {
      try {
        const res = await fetch("/api/orient", { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Orient fetch error:", e);
        }
      }
    }

    fetchOrient();
    const interval = setInterval(fetchOrient, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return data;
}
