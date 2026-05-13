"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKeyDef {
  key: string;
  label: string;
  description: string;
  signupUrl: string;
  category: string;
  configured: boolean;
  maskedValue: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  maritime: { label: "MARITIME", color: "#00aaff" },
  container: { label: "CONTAINER TRACKING", color: "#ff8800" },
  satellite: { label: "SATELLITE", color: "#ff6600" },
  news: { label: "NEWS & EVENTS", color: "#ffaa00" },
  other: { label: "OTHER", color: "#888888" },
};

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [keys, setKeys] = useState<ApiKeyDef[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Set<string>>(new Set());

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setEdits({});
      setMessage(null);
      setShowValues(new Set());
      fetchKeys();
    }
  }, [open, fetchKeys]);

  const handleSave = async () => {
    // Only send non-empty edits
    const toSave: Record<string, string> = {};
    for (const [k, v] of Object.entries(edits)) {
      if (v !== undefined) toSave[k] = v;
    }

    if (Object.keys(toSave).length === 0) {
      setMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: toSave }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setEdits({});
        fetchKeys(); // Refresh
      } else {
        setMessage(data.error || "Save failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (key: string) => {
    setShowValues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!open) return null;

  // Group keys by category
  const grouped = new Map<string, ApiKeyDef[]>();
  for (const k of keys) {
    const cat = k.category || "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(k);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[600px] max-h-[80vh] bg-[#0a0f0a] border border-green-900/60 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-green-900/40 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-mono text-sm text-green-400 tracking-widest font-bold">
              SETTINGS
            </h2>
            <p className="font-mono text-[9px] text-green-700 tracking-wider mt-0.5">
              API KEYS & DATA SOURCE CONFIGURATION
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-green-900/40 font-mono text-green-600 hover:text-green-400 hover:border-green-600 transition-all text-xs"
          >
            X
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-mono text-xs text-green-700 animate-pulse">
                LOADING CONFIGURATION...
              </span>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([cat, catKeys]) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.other;
              return (
                <div key={cat}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span
                      className="font-mono text-[10px] tracking-widest font-bold"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Keys in category */}
                  <div className="space-y-2">
                    {catKeys.map((def) => (
                      <div
                        key={def.key}
                        className="border border-green-900/30 bg-green-400/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-green-400 font-bold tracking-wider">
                              {def.label}
                            </span>
                            {def.configured && (
                              <span className="font-mono text-[7px] px-1.5 py-0.5 border border-green-700/40 text-green-500 bg-green-400/5 tracking-wider">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {def.signupUrl && (
                            <a
                              href={def.signupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[8px] text-blue-500 hover:text-blue-400 tracking-wider underline underline-offset-2"
                            >
                              SIGN UP
                            </a>
                          )}
                        </div>

                        <p className="font-mono text-[8px] text-green-700 mb-2">
                          {def.description}
                        </p>

                        {/* Current value (masked) */}
                        {def.configured && !(def.key in edits) && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-[9px] text-green-600">
                              Current:{" "}
                              <span className="text-green-500">
                                {showValues.has(def.key)
                                  ? def.maskedValue
                                  : "••••••••"}
                              </span>
                            </span>
                            <button
                              onClick={() => toggleShow(def.key)}
                              className="font-mono text-[7px] text-green-700 hover:text-green-500 tracking-wider"
                            >
                              {showValues.has(def.key) ? "HIDE" : "SHOW"}
                            </button>
                          </div>
                        )}

                        {/* Input */}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={
                              def.key in edits ? edits[def.key] : ""
                            }
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [def.key]: e.target.value,
                              }))
                            }
                            placeholder={
                              def.configured
                                ? "Enter new key to replace..."
                                : "Paste your API key here..."
                            }
                            className="flex-1 bg-transparent border border-green-900/50 px-2 py-1.5 text-[10px] font-mono text-green-400 placeholder-green-800/60 tracking-wider focus:outline-none focus:border-green-600 transition-colors"
                            spellCheck={false}
                            autoComplete="off"
                          />
                          {def.configured && (
                            <button
                              onClick={() =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [def.key]: "",
                                }))
                              }
                              className="px-2 py-1 border border-red-900/40 font-mono text-[8px] text-red-600 hover:text-red-400 hover:border-red-600 tracking-wider transition-all"
                              title="Remove this key"
                            >
                              DEL
                            </button>
                          )}
                        </div>

                        {/* Env var name */}
                        <div className="mt-1.5">
                          <span className="font-mono text-[7px] text-green-900 tracking-wider">
                            ENV: {def.key}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-green-900/40 flex items-center justify-between shrink-0">
          {/* Message */}
          <div className="flex-1 mr-3">
            {message && (
              <span
                className={`font-mono text-[9px] tracking-wider ${
                  message.includes("error") || message.includes("fail")
                    ? "text-red-400"
                    : "text-green-500"
                }`}
              >
                {message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-green-900/40 font-mono text-[9px] text-green-600 hover:text-green-400 hover:border-green-600 tracking-wider transition-all"
            >
              CLOSE
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(edits).length === 0}
              className="px-4 py-1.5 border border-green-600/50 bg-green-400/10 font-mono text-[9px] text-green-400 hover:bg-green-400/20 hover:border-green-500 tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? "SAVING..." : "SAVE KEYS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
