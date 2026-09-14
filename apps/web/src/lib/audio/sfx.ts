// Synthesizes short retro "blip" tones via the Web Audio API instead of shipping audio asset files.
// This module is deliberately unaware of settings — callers gate on the SOUND FX setting themselves.

export type SfxKind = "place" | "error" | "notesToggle" | "win";

let audioContext: AudioContext | null = null;

// Lazy module-level AudioContext: browsers block creation/autoplay before a user gesture, and every
// call site here is already the result of a click or keypress, so first-use lazy init is sufficient.
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
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
