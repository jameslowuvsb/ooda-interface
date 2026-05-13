"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(false);

      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          router.push("/");
        } else {
          setError(true);
          setPassword("");
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [password, router]
  );

  return (
    <div className="h-screen w-screen bg-[#000a00] flex items-center justify-center">
      <div className="w-80 border border-green-900/50 bg-black/80 backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-green-900/40">
          <h1 className="font-mono text-lg text-green-400 font-bold tracking-widest text-center hud-glow">
            OODA
          </h1>
          <p className="font-mono text-[9px] text-green-700 tracking-wider text-center mt-1">
            OBSERVE / ORIENT / DECIDE / ACT
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-mono text-[9px] text-green-700 tracking-widest mb-2">
              ACCESS CODE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-transparent border border-green-900/50 px-3 py-2 text-sm font-mono text-green-400 tracking-[0.3em] text-center placeholder-green-800 focus:outline-none focus:border-green-600 transition-colors"
              placeholder="****"
            />
          </div>

          {error && (
            <div className="font-mono text-[9px] text-red-500 tracking-wider text-center">
              ACCESS DENIED — INVALID CODE
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2 border border-green-700/50 bg-green-400/5 font-mono text-xs text-green-400 tracking-widest hover:bg-green-400/10 hover:border-green-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? "AUTHENTICATING..." : "ENTER"}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-green-900/30">
          <p className="font-mono text-[7px] text-green-900 tracking-wider text-center">
            CLASSIFIED SYSTEM — AUTHORIZED PERSONNEL ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
