"use client";

import { useEffect, useState } from "react";
import { useOODAStore } from "@/stores/ooda-store";

interface WeatherPoint {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  temp: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  windGust?: number;
  visibility: number;
  condition: string;
  description: string;
  icon: string;
  seaState?: string;
  clouds: number;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes — weather doesn't change fast

export function useWeather() {
  const [weather, setWeather] = useState<WeatherPoint[]>([]);
  const enabled = useOODAStore((s) => s.layers.weather);

  useEffect(() => {
    if (!enabled) {
      setWeather([]);
      return;
    }

    const controller = new AbortController();

    async function fetchWeather() {
      try {
        const res = await fetch("/api/weather", { signal: controller.signal });
        if (!res.ok) return;
        const data: WeatherPoint[] = await res.json();
        setWeather(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Weather fetch error:", e);
        }
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled]);

  return weather;
}
