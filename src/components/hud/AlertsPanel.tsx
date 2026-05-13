"use client";

import { useOrient } from "@/hooks/useOrient";
import { useOODAStore } from "@/stores/ooda-store";

const SEVERITY_COLORS = {
  high: "#ff3333",
  medium: "#ff8800",
  low: "#ffff00",
};

const ALERT_TYPE_ICONS = {
  ais_gap: "AIS",
  speed_anomaly: "SPD",
  sts_zone: "STS",
  heading_mismatch: "HDG",
};

export function AlertsPanel() {
  const { alerts, summary } = useOrient();
  const flyTo = useOODAStore((s) => s.flyTo);

  return (
    <div className="border-t border-green-900/30 pt-3 mt-3">
      <div className="text-green-700 font-mono text-[10px] tracking-widest mb-2">
        ORIENT // THREAT ANALYSIS
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        <CountBadge label="AIS GAPS" count={summary.aisGaps} color="#ff3333" />
        <CountBadge label="SPD ANOM" count={summary.speedAnomalies} color="#ff3333" />
        <CountBadge label="STS ZONE" count={summary.stsZoneAlerts} color="#ff8800" />
        <CountBadge label="HDG MISS" count={summary.headingMismatches} color="#ffff00" />
      </div>

      {/* Alert list */}
      <div className="max-h-40 overflow-y-auto space-y-1">
        {alerts.length === 0 ? (
          <div className="text-green-800 font-mono text-[10px] text-center py-2">
            NO ACTIVE ALERTS
          </div>
        ) : (
          alerts.slice(0, 10).map((alert) => (
            <button
              key={alert.id}
              onClick={() => flyTo(alert.longitude, alert.latitude, 500_000)}
              className="w-full text-left p-1.5 border border-green-900/30 hover:border-green-700/50 hover:bg-green-400/5 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono text-[8px] font-bold px-1 py-0.5"
                  style={{
                    color: "#000",
                    backgroundColor: SEVERITY_COLORS[alert.severity],
                  }}
                >
                  {ALERT_TYPE_ICONS[alert.alertType]}
                </span>
                <span
                  className="font-mono text-[9px] truncate"
                  style={{ color: SEVERITY_COLORS[alert.severity] }}
                >
                  {alert.vesselName}
                </span>
              </div>
              <div className="font-mono text-[8px] text-green-700 mt-0.5 line-clamp-2">
                {alert.description}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CountBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-1.5 py-0.5 border border-green-900/20">
      <span className="font-mono text-[8px] text-green-700">{label}</span>
      <span
        className="font-mono text-[10px] font-bold"
        style={{ color: count > 0 ? color : "#333" }}
      >
        {count}
      </span>
    </div>
  );
}
