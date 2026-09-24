import { describe, expect, it } from "vitest";
import { createRng, randomSeed, shuffled } from "./random.js";

describe("createRng", () => {
  it("replays the same sequence for the same seed", () => {
    const a = createRng("seed-1");
    const b = createRng("seed-1");
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it("gives different sequences for different seeds, always within [0, 1)", () => {
    const a = Array.from({ length: 1000 }, createRng("seed-1"));
    const b = Array.from({ length: 1000 }, createRng("seed-2"));
    expect(a).not.toEqual(b);
    expect(a.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("shuffles deterministically and keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(shuffled(items, createRng(7))).toEqual(shuffled(items, createRng(7)));
    expect(shuffled(items, createRng(7)).sort()).toEqual(items);
  });

  it("produces short printable seeds", () => {
    expect(randomSeed()).toMatch(/^[0-9a-z]{7}$/);
  });
});
