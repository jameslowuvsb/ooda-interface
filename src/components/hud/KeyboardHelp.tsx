"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const shortcuts = [
  { key: "1-6", desc: "Toggle layers" },
  { key: "E/F/N/C", desc: "View modes" },
  { key: "H", desc: "Fly to Hormuz" },
  { key: "G", desc: "Global view" },
  { key: "ESC", desc: "Deselect" },
  { key: "?", desc: "This help" },
];

export function KeyboardHelp() {
  useKeyboardShortcuts();
  const [show, setShow] = useState(false);

  // Listen for ? key to toggle help
  if (typeof window !== "undefined") {
    // This is handled via the component mount
  }

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="fixed bottom-3 left-3 z-50 w-6 h-6 flex items-center justify-center border border-green-900/50 text-green-700 font-mono text-xs hover:text-green-400 hover:border-green-600 transition-all bg-black/80"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {show && (
        <div className="fixed bottom-12 left-3 z-50 bg-black/95 border border-green-700/50 p-3 backdrop-blur-sm">
          <div className="text-green-400 font-mono text-[10px] tracking-widest mb-2">
            KEYBOARD SHORTCUTS
          </div>
          <div className="space-y-1">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center gap-3 font-mono text-[10px]">
                <span className="text-green-400 w-12 text-right">{s.key}</span>
                <span className="text-green-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
