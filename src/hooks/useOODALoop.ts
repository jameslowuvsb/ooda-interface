"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { OODALoopResult } from "@/lib/act/executor";
import { alertOnThreatChange } from "@/lib/audio-alerts";

/**
 * Self-pacing OODA loop hook.
 *
 * Runs the full OBSERVE→ORIENT→DECIDE→ACT cycle,
 * then schedules the next iteration based on the ACT phase's
 * recommended timing (faster during elevated threats, slower when calm).
 *
 * This is the core OODA feedback loop — it doesn't just run on a fixed interval,
 * it ADAPTS its own tempo based on what it finds.
 */
export function useOODALoop() {
  const [result, setResult] = useState<OODALoopResult | null>(null);
  const [history, setHistory] = useState<OODALoopResult[]>([]);
  const [running, setRunning] = useState(false);
  const [loopActive, setLoopActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const runLoop = useCallback(async () => {
    setRunning(true);
    controllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/act", {
        signal: controllerRef.current.signal,
      });
      if (!res.ok) return;
      const data: OODALoopResult = await res.json();
      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 20)); // Keep last 20

      // Audio alert on threat level escalation
      alertOnThreatChange(data.threatLevel);

      // Self-pace: schedule next loop based on ACT recommendation
      if (loopActive) {
        timerRef.current = setTimeout(runLoop, data.nextLoopMs);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("OODA loop error:", e);
        // Retry in 30s on error
        if (loopActive) {
          timerRef.current = setTimeout(runLoop, 30_000);
        }
      }
    } finally {
      setRunning(false);
    }
  }, [loopActive]);

  const start = useCallback(() => {
    setLoopActive(true);
  }, []);

  const stop = useCallback(() => {
    setLoopActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  // Start/stop loop based on active state
  useEffect(() => {
    if (loopActive) {
      runLoop();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [loopActive, runLoop]);

  return { result, history, running, loopActive, start, stop };
}
