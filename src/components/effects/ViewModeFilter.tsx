"use client";

import { useOODAStore } from "@/stores/ooda-store";

export function ViewModeFilter({ children }: { children: React.ReactNode }) {
  const viewMode = useOODAStore((s) => s.viewMode);

  const filters: Record<string, string> = {
    eo: "none",
    flir: "grayscale(100%) contrast(1.5) brightness(0.8) sepia(100%) hue-rotate(180deg)",
    nightvision: "brightness(1.2) contrast(1.3) saturate(0) sepia(100%) hue-rotate(70deg)",
    crt: "contrast(1.1) brightness(0.95)",
  };

  return (
    <div
      className="w-full h-full relative"
      style={{ filter: filters[viewMode] || "none" }}
    >
      {children}
      {viewMode === "crt" && <CRTOverlay />}
      {viewMode === "nightvision" && <NVOverlay />}
    </div>
  );
}

function CRTOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
        zIndex: 100,
      }}
    />
  );
}

function NVOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-full"
      style={{
        background:
          "radial-gradient(circle, transparent 50%, rgba(0,0,0,0.7) 100%)",
        zIndex: 100,
      }}
    />
  );
}
