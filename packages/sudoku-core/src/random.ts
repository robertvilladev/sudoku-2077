/** A source of uniform floats in [0, 1), the same contract as `Math.random`. */
export type Rng = () => number;

/** FNV-1a: turns an arbitrary seed string into a 32-bit integer for the PRNG below. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic PRNG (mulberry32). The same seed always yields the same sequence, so a puzzle
 * generated from a seed can be regenerated bit-for-bit when someone reports "seed X is broken".
 */
export function createRng(seed: string | number): Rng {
  let state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed string, for callers that want reproducibility without choosing a seed. */
export function randomSeed(): string {
  return Math.floor(Math.random() * 2 ** 32)
    .toString(36)
    .padStart(7, "0");
}

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
