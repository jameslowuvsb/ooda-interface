"use client";

import { useEffect } from "react";
import { useOODAStore } from "@/stores/ooda-store";
import type { LayerKey, ViewMode } from "@/types";

/**
 * Global keyboard shortcuts for the OODA interface
 *
 * Layer toggles:
 *   1 — Toggle flights
 *   2 — Toggle satellites
 *   3 — Toggle vessels
 *   4 — Toggle seismic
 *   5 — Toggle weather
 *   6 — Toggle news
 *
 * View modes:
 *   E — EO (electro-optical)
 *   F — FLIR (thermal)
 *   N — Night vision
 *   C — CRT mode
 *
 * Navigation:
 *   H — Fly to Hormuz
 *   G — Global view
 *   Escape — Deselect entity
 */

const layerKeys: Record<string, LayerKey> = {
  "1": "flights",
  "2": "satellites",
  "3": "vessels",
  "4": "earthquakes",
  "5": "weather",
  "6": "news",
};

const viewKeys: Record<string, ViewMode> = {
  e: "eo",
  f: "flir",
  n: "nightvision",
  c: "crt",
};

export function useKeyboardShortcuts() {
  const toggleLayer = useOODAStore((s) => s.toggleLayer);
  const setViewMode = useOODAStore((s) => s.setViewMode);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const flyTo = useOODAStore((s) => s.flyTo);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't capture when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Layer toggles
      if (layerKeys[key]) {
        e.preventDefault();
        toggleLayer(layerKeys[key]);
        return;
      }

      // View mode switches
      if (viewKeys[key]) {
        e.preventDefault();
        setViewMode(viewKeys[key]);
        return;
      }

      // Navigation
      if (key === "h") {
        e.preventDefault();
        flyTo(56.3, 26.5, 3_000_000); // Hormuz
        return;
      }

      if (key === "g") {
        e.preventDefault();
        flyTo(0, 20, 20_000_000); // Global
        return;
      }

      // Deselect
      if (key === "escape") {
        setSelectedEntity(null);
        return;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleLayer, setViewMode, setSelectedEntity, flyTo]);
}
