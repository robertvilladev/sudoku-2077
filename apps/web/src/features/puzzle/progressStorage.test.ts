import { beforeEach, describe, expect, it } from "vitest";
import { clearProgress, readProgress, writeProgress, type StoredProgress } from "./progressStorage.js";

const puzzleId = "test-puzzle-1";

describe("progressStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a written progress entry, including the notes Set<->array conversion", () => {
    const progress: StoredProgress = {
      grid: [1, 0, 0, 2],
      notes: { 1: new Set([3, 4]), 2: new Set([5]) },
      mistakeCount: 1,
      combo: 2,
      maxCombo: 3,
      elapsedSeconds: 42,
    };

    writeProgress(puzzleId, progress);
    const result = readProgress(puzzleId);

    expect(result).not.toBeNull();
    expect(result?.grid).toEqual(progress.grid);
    expect(result?.mistakeCount).toBe(1);
    expect(result?.combo).toBe(2);
    expect(result?.maxCombo).toBe(3);
    expect(result?.elapsedSeconds).toBe(42);
    expect(result?.notes[1]).toBeInstanceOf(Set);
    expect(result?.notes[1]?.has(3)).toBe(true);
    expect(result?.notes[1]?.has(4)).toBe(true);
    expect(result?.notes[2]?.has(5)).toBe(true);
  });

  it("returns null for a missing entry", () => {
    expect(readProgress("never-written")).toBeNull();
  });

  it("returns null for a corrupt entry instead of throwing", () => {
    localStorage.setItem(`sudoku2077.progress.${puzzleId}`, "{not valid json");
    expect(readProgress(puzzleId)).toBeNull();
  });

  it("returns null for a syntactically-valid entry missing the grid field", () => {
    localStorage.setItem(`sudoku2077.progress.${puzzleId}`, JSON.stringify({ notes: {} }));
    expect(readProgress(puzzleId)).toBeNull();
  });

  it("returns null for a syntactically-valid entry missing the mistakeCount field", () => {
    localStorage.setItem(
      `sudoku2077.progress.${puzzleId}`,
      JSON.stringify({ grid: [1, 0, 0, 2], notes: {}, combo: 0, maxCombo: 0, elapsedSeconds: 0 })
    );
    expect(readProgress(puzzleId)).toBeNull();
  });

  it("clearProgress removes the stored entry", () => {
    writeProgress(puzzleId, {
      grid: [1],
      notes: {},
      mistakeCount: 0,
      combo: 0,
      maxCombo: 0,
      elapsedSeconds: 0,
    });
    clearProgress(puzzleId);
    expect(readProgress(puzzleId)).toBeNull();
  });
});
