import { NextResponse } from "next/server";

/**
 * ACT: Smart glasses connectivity check
 * Proxies health check to even-terminal on localhost:3456
 * Used by the Header GlassesStatus indicator
 */
export async function GET() {
  try {
    const res = await fetch("http://localhost:3456/health", {
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      return NextResponse.json({
        connected: true,
        service: "even-terminal",
        port: 3456,
      });
    }

    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
