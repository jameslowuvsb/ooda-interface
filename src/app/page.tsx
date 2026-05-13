"use client";

import dynamic from "next/dynamic";
import { Header } from "@/components/hud/Header";
import { Sidebar } from "@/components/hud/Sidebar";
import { InfoPanel } from "@/components/hud/InfoPanel";
import { ViewModeFilter } from "@/components/effects/ViewModeFilter";
import { ToolButtons } from "@/components/hud/ToolButtons";
import { NewsPopup } from "@/components/hud/NewsPopup";
import { VesselPopup } from "@/components/hud/VesselPopup";
import { SatellitePopup } from "@/components/hud/SatellitePopup";
import { FlightPopup } from "@/components/hud/FlightPopup";
import { ReconPopup } from "@/components/hud/ReconPopup";
import { MetricsBar } from "@/components/hud/MetricsBar";
import { SettingsModal } from "@/components/hud/SettingsModal";
import { useOODAStore } from "@/stores/ooda-store";

// CesiumJS cannot run server-side
const Globe = dynamic(
  () => import("@/components/globe/Globe").then((m) => m.Globe),
  { ssr: false }
);

export default function OODAPage() {
  const settingsOpen = useOODAStore((s) => s.settingsOpen);
  const setSettingsOpen = useOODAStore((s) => s.setSettingsOpen);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000a00]">
      <ToolButtons />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <ViewModeFilter>
            <Globe />
          </ViewModeFilter>
          <NewsPopup />
          <VesselPopup />
          <SatellitePopup />
          <FlightPopup />
          <ReconPopup />
        </main>
        <InfoPanel />
      </div>
      <MetricsBar />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
