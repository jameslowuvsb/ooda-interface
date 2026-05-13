/**
 * ACT: Push critical alerts to Even Realities smart glasses
 * via even-terminal running on localhost:3456
 *
 * This closes the OODA feedback loop — when the system detects
 * a critical threat, it pushes the alert directly to the operator's
 * field of view via smart glasses.
 */

const EVEN_TERMINAL_URL = "http://localhost:3456";

interface GlassesMessage {
  text: string;
  duration?: number; // seconds to display
}

/**
 * Check if even-terminal is reachable
 */
export async function isGlassesConnected(): Promise<boolean> {
  try {
    const res = await fetch(`${EVEN_TERMINAL_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push a text message to the smart glasses display
 */
export async function pushToGlasses(message: GlassesMessage): Promise<boolean> {
  try {
    const res = await fetch(`${EVEN_TERMINAL_URL}/display`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message.text,
        duration: message.duration || 10,
      }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Format a threat alert for glasses display (short, scannable)
 */
export function formatAlertForGlasses(
  threatLevel: string,
  summary: string,
  topFinding?: string
): string {
  const lines: string[] = [];
  lines.push(`[OODA ${threatLevel}]`);
  lines.push(summary.slice(0, 80));
  if (topFinding) {
    lines.push(topFinding.slice(0, 60));
  }
  return lines.join("\n");
}

/**
 * Push an OODA loop result to glasses if threat level is HIGH or CRITICAL
 */
export async function pushOODAAlertToGlasses(
  threatLevel: string,
  situation: string,
  keyFindings: string[]
): Promise<boolean> {
  if (threatLevel !== "HIGH" && threatLevel !== "CRITICAL") {
    return false; // Only push urgent alerts
  }

  const connected = await isGlassesConnected();
  if (!connected) return false;

  const text = formatAlertForGlasses(
    threatLevel,
    situation,
    keyFindings[0]
  );

  const duration = threatLevel === "CRITICAL" ? 15 : 10;
  return pushToGlasses({ text, duration });
}
