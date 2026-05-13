"use client";

import { useCallback } from "react";
import { useOODALoop } from "@/hooks/useOODALoop";
import { useOODAStore } from "@/stores/ooda-store";
import type { OODALoopResult } from "@/lib/act/executor";

const THREAT_COLORS: Record<string, string> = {
  NORMAL: "#00ff41",
  ELEVATED: "#ffff00",
  HIGH: "#ff8800",
  CRITICAL: "#ff0000",
};

const PRIORITY_COLORS: Record<string, string> = {
  immediate: "#ff0000",
  high: "#ff8800",
  routine: "#00ff41",
};

export function OODAPanel() {
  const { result, history, running, loopActive, start, stop } = useOODALoop();
  const flyTo = useOODAStore((s) => s.flyTo);

  const exportBrief = useCallback(() => {
    if (!result) return;
    const lines = [
      `${"=".repeat(60)}`,
      `OODA INTELLIGENCE BRIEF`,
      `${"=".repeat(60)}`,
      `Classification: ${result.brief.classification}`,
      `DTG: ${result.brief.timestamp}`,
      `Threat Level: ${result.brief.threatLevel}`,
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      `Loop ID: ${result.loopId}`,
      ``,
      `SITUATION:`,
      result.brief.summary,
      ``,
      `KEY FINDINGS:`,
      ...result.brief.findings.map((f, i) => `  ${i + 1}. ${f}`),
      ``,
      `RECOMMENDATIONS:`,
      ...result.brief.recommendations.map((r, i) => `  ${i + 1}. ${r}`),
      ``,
      `WATCH AREAS:`,
      ...result.brief.watchAreas.map((a) => `  - ${a}`),
      ``,
      `ACTIONS TAKEN:`,
      ...result.actions.map((a) => `  [${a.type.toUpperCase()}] ${a.description}`),
      ``,
      `OBSERVE FEEDBACK:`,
      ...result.observeAdjustments.map(
        (a) => `  ${a.parameter}: ${a.previousValue} -> ${a.newValue} (${a.reason})`
      ),
      ``,
      `Next loop in: ${(result.nextLoopMs / 1000).toFixed(0)}s`,
      `${"=".repeat(60)}`,
    ];
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      // Brief visual feedback could be added here
    });
  }, [result]);

  return (
    <div className="flex flex-col h-full">
      {/* Loop Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-green-700 font-mono text-[10px] tracking-widest">
          OODA LOOP
        </div>
        <div className="flex items-center gap-1">
          {result && (
            <button
              onClick={exportBrief}
              className="px-2 py-1 text-[10px] font-mono tracking-wider border border-green-900/50 text-green-700 hover:text-green-400 hover:border-green-600 transition-all"
              title="Copy intel brief to clipboard"
            >
              EXPORT
            </button>
          )}
          <button
            onClick={loopActive ? stop : start}
            className={`px-3 py-1 text-[10px] font-mono tracking-wider border transition-all ${
              loopActive
                ? "border-red-600 text-red-400 bg-red-400/10 hover:bg-red-400/20"
                : "border-green-600 text-green-400 bg-green-400/10 hover:bg-green-400/20"
            }`}
          >
            {loopActive ? (running ? "RUNNING..." : "STOP LOOP") : "START LOOP"}
          </button>
        </div>
      </div>

      {/* Current Assessment */}
      {result ? (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* Threat Level Banner */}
          <div
            className="p-2 border text-center"
            style={{
              borderColor: THREAT_COLORS[result.threatLevel],
              backgroundColor: `${THREAT_COLORS[result.threatLevel]}10`,
            }}
          >
            <div
              className="font-mono text-lg font-bold tracking-widest"
              style={{ color: THREAT_COLORS[result.threatLevel] }}
            >
              {result.threatLevel}
            </div>
            <div className="font-mono text-[9px] text-green-600">
              CONFIDENCE: {(result.confidence * 100).toFixed(0)}% | LOOP:{" "}
              {result.loopId}
            </div>
          </div>

          {/* AI Intelligence Brief (if available) */}
          {result.brief.aiSummary ? (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="text-cyan-600 font-mono text-[9px] tracking-widest">
                  AI INTEL BRIEF
                </div>
                <span className="text-[7px] font-mono text-cyan-800 border border-cyan-900/30 px-1">
                  {result.brief.aiModel || "LLM"}
                </span>
              </div>
              <div className="font-mono text-[9px] text-cyan-400 leading-relaxed mb-2">
                {result.brief.aiSummary}
              </div>
              {result.brief.aiStrategicContext && (
                <div className="font-mono text-[8px] text-cyan-600 leading-relaxed pl-2 border-l border-cyan-800/30 mb-2">
                  {result.brief.aiStrategicContext}
                </div>
              )}
              {result.brief.aiPatterns && result.brief.aiPatterns.length > 0 && (
                <div className="mb-2">
                  <div className="text-cyan-700 font-mono text-[8px] tracking-widest mb-0.5">
                    PATTERNS DETECTED
                  </div>
                  {result.brief.aiPatterns.map((p, i) => (
                    <div key={i} className="font-mono text-[8px] text-cyan-500 pl-2 border-l border-cyan-800/20 mb-0.5">
                      {p}
                    </div>
                  ))}
                </div>
              )}
              {result.brief.aiRiskAssessment && (
                <div className="font-mono text-[8px] text-yellow-500 p-1.5 border border-yellow-900/30 bg-yellow-400/5 mb-2">
                  {result.brief.aiRiskAssessment}
                </div>
              )}
              {result.brief.aiInsights && result.brief.aiInsights.length > 0 && (
                <div className="mb-2">
                  <div className="text-cyan-700 font-mono text-[8px] tracking-widest mb-0.5">
                    AI INSIGHTS
                  </div>
                  {result.brief.aiInsights.map((insight, i) => (
                    <div key={i} className="font-mono text-[8px] text-cyan-400 p-1 border border-cyan-900/20 mb-0.5">
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
                INTEL BRIEF
              </div>
              <div className="font-mono text-[9px] text-green-500 leading-relaxed">
                {result.brief.summary}
              </div>
            </div>
          )}

          {/* Key Findings */}
          {result.brief.findings.length > 0 && (
            <div>
              <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
                KEY FINDINGS
              </div>
              {result.brief.findings.map((f, i) => (
                <div
                  key={i}
                  className="font-mono text-[9px] text-green-500 pl-2 border-l border-green-800 mb-1"
                >
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations (DECIDE output) */}
          {result.brief.recommendations.length > 0 && (
            <div>
              <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
                DECIDE // RECOMMENDATIONS
              </div>
              {result.brief.recommendations.map((r, i) => {
                // Parse priority from formatted string
                const match = r.match(/^\[(\w+)\]/);
                const priority = match?.[1]?.toLowerCase() || "routine";
                return (
                  <div
                    key={i}
                    className="font-mono text-[8px] p-1.5 border mb-1 cursor-pointer hover:bg-green-400/5"
                    style={{
                      borderColor: `${PRIORITY_COLORS[priority] || "#333"}40`,
                      color: PRIORITY_COLORS[priority] || "#00ff41",
                    }}
                  >
                    {r}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions Taken (ACT output) */}
          <div>
            <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
              ACT // ACTIONS TAKEN
            </div>
            {result.actions.map((action) => (
              <div
                key={action.id}
                className="font-mono text-[8px] text-green-600 p-1 border border-green-900/20 mb-1"
              >
                <span className="text-green-800">[{action.type.toUpperCase()}]</span>{" "}
                {action.description}
              </div>
            ))}
          </div>

          {/* OBSERVE Feedback (loop closure) */}
          {result.observeAdjustments.length > 0 && (
            <div>
              <div className="text-yellow-600 font-mono text-[9px] tracking-widest mb-1">
                FEEDBACK → OBSERVE
              </div>
              {result.observeAdjustments.map((adj, i) => (
                <div
                  key={i}
                  className="font-mono text-[8px] text-yellow-500 p-1 border border-yellow-900/30 mb-1"
                >
                  {adj.parameter}: {adj.previousValue} → {adj.newValue}
                  <div className="text-yellow-700 mt-0.5">{adj.reason}</div>
                </div>
              ))}
            </div>
          )}

          {/* Watch Zones (click to navigate) */}
          {result.brief.watchAreas.length > 0 && (
            <div>
              <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
                WATCH ZONES
              </div>
              {result.brief.watchAreas.map((area, i) => (
                <div
                  key={i}
                  className="font-mono text-[8px] text-green-600 p-1 border border-green-900/20 mb-1"
                >
                  {area}
                </div>
              ))}
            </div>
          )}

          {/* Loop Timing */}
          <div className="border-t border-green-900/30 pt-2">
            <div className="font-mono text-[8px] text-green-700 flex justify-between">
              <span>NEXT LOOP IN</span>
              <span>{(result.nextLoopMs / 1000).toFixed(0)}s</span>
            </div>
            <div className="font-mono text-[8px] text-green-800 flex justify-between">
              <span>CYCLE TIME</span>
              <span>{result.duration}ms</span>
            </div>
          </div>

          {/* Loop History */}
          {history.length > 1 && (
            <div className="border-t border-green-900/30 pt-2">
              <div className="text-green-700 font-mono text-[9px] tracking-widest mb-1">
                LOOP HISTORY
              </div>
              {history.slice(0, 5).map((h) => (
                <div
                  key={h.loopId}
                  className="font-mono text-[8px] flex justify-between py-0.5"
                >
                  <span className="text-green-800">{h.loopId}</span>
                  <span style={{ color: THREAT_COLORS[h.threatLevel] }}>
                    {h.threatLevel}
                  </span>
                  <span className="text-green-700">
                    {h.actions.length} acts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-green-800 font-mono text-xs mb-2">
              OODA LOOP INACTIVE
            </div>
            <div className="text-green-900 font-mono text-[9px] max-w-48">
              Start the loop to begin continuous
              OBSERVE→ORIENT→DECIDE→ACT cycles.
              The loop self-paces based on threat level.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
