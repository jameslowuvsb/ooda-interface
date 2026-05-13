import { NextResponse } from "next/server";
import { initAISStream, getAISStats } from "@/lib/aisstream-client";

/**
 * AISstream connection statistics
 */
export async function GET() {
  await initAISStream();
  const stats = getAISStats();
  return NextResponse.json(stats);
}
