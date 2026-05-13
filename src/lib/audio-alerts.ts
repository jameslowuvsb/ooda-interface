"use client";

/**
 * Audio alert system for OODA threat level changes
 *
 * Uses the Web Audio API to generate procedural alert tones —
 * no audio files needed. Different patterns for each threat level:
 *   ELEVATED — single low beep
 *   HIGH — double beep
 *   CRITICAL — urgent triple pulse
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  delay: number = 0,
  gain: number = 0.15
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = frequency;

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.setValueAtTime(gain, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // Audio not available
  }
}

export function playElevatedAlert(): void {
  playTone(440, 0.2, 0, 0.1);
}

export function playHighAlert(): void {
  playTone(660, 0.15, 0, 0.12);
  playTone(660, 0.15, 0.25, 0.12);
}

export function playCriticalAlert(): void {
  playTone(880, 0.1, 0, 0.18);
  playTone(880, 0.1, 0.18, 0.18);
  playTone(880, 0.1, 0.36, 0.18);
}

export function playAlertForThreatLevel(level: string): void {
  switch (level) {
    case "ELEVATED":
      playElevatedAlert();
      break;
    case "HIGH":
      playHighAlert();
      break;
    case "CRITICAL":
      playCriticalAlert();
      break;
    // NORMAL — no sound
  }
}

// Track the last played threat level to avoid duplicate sounds
let lastAlertLevel = "NORMAL";

/**
 * Play alert sound only when threat level changes or escalates
 */
export function alertOnThreatChange(newLevel: string): void {
  if (newLevel === lastAlertLevel) return;

  const levels = ["NORMAL", "ELEVATED", "HIGH", "CRITICAL"];
  const oldIdx = levels.indexOf(lastAlertLevel);
  const newIdx = levels.indexOf(newLevel);

  // Only alert on escalation
  if (newIdx > oldIdx) {
    playAlertForThreatLevel(newLevel);
  }

  lastAlertLevel = newLevel;
}
