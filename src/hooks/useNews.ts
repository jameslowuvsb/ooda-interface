"use client";

import { useEffect } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { NewsArticle } from "@/types";

const POLL_INTERVAL = 120_000; // 2 min — news doesn't change that fast

export function useNews() {
  const setNews = useOODAStore((s) => s.setNews);
  const enabled = useOODAStore((s) => s.layers.news);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchNews() {
      try {
        const res = await fetch("/api/news", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: NewsArticle[] = await res.json();
        setNews(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("News fetch error:", e);
        }
      }
    }

    fetchNews();
    const interval = setInterval(fetchNews, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, setNews]);
}
