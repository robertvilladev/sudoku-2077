// Synthesizes short retro "blip" tones via the Web Audio API instead of shipping audio asset files.
// This module is deliberately unaware of settings — callers gate on the SOUND FX setting themselves.

export type SfxKind = "place" | "error" | "notesToggle" | "win";

let audioContext: AudioContext | null = null;

// Lazy module-level AudioContext, shared by playSfx and the ambient hum. Most call sites follow a
// user gesture (click/keypress), but the hum's start effect can fire on mount from a persisted
// localStorage setting with no gesture involved, which can create/leave the context "suspended".
// So attempt resume() on every access: browsers that block a gesture-less resume just leave it
// suspended until a real gesture happens, and we retry here on the next getAudioContext() call —
// this also self-heals any existing SFX that shared the same suspended context.
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  peakGain = 0.2
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

let hum: { oscillator: OscillatorNode; gain: GainNode } | null = null;

// Sustained drone, unlike playTone's fire-and-forget blips: the oscillator keeps running until
// stopAmbientHum() is called, so the pair share module-level state across calls.
export function startAmbientHum(): void {
  if (hum) return;
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 55;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = 0.04;
  oscillator.start();
  hum = { oscillator, gain };
}

export function stopAmbientHum(): void {
  if (!hum) return;
  const { oscillator, gain } = hum;
  const ctx = gain.context;
  const now = ctx.currentTime;
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  oscillator.stop(now + 0.2);
  hum = null;
}

export function playSfx(kind: SfxKind): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  switch (kind) {
    case "place":
      playTone(ctx, 880, now, 0.08, "sine", 0.2);
      break;
    case "error":
      playTone(ctx, 140, now, 0.2, "sawtooth", 0.25);
      break;
    case "notesToggle":
      playTone(ctx, 600, now, 0.04, "square", 0.08);
      break;
    case "win":
      playTone(ctx, 523.25, now, 0.12, "sine", 0.2);
      playTone(ctx, 659.25, now + 0.1, 0.12, "sine", 0.2);
      playTone(ctx, 783.99, now + 0.2, 0.16, "sine", 0.2);
      break;
  }
}
