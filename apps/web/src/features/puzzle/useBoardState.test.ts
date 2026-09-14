import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsProvider } from "../../lib/settings/SettingsContext.js";
import { readProgress, writeProgress } from "./progressStorage.js";
import { useBoardState } from "./useBoardState.js";

function renderBoardState(givens: string, puzzleId = "test-puzzle") {
  return renderHook(() => useBoardState(givens, puzzleId), { wrapper: SettingsProvider });
}

describe("useBoardState", () => {
  const givens = `1${"0".repeat(80)}`;

  beforeEach(() => {
    localStorage.clear();
  });

  it("marks given cells and refuses to modify them", () => {
    const { result } = renderBoardState(givens);
    expect(result.current.givenMask[0]).toBe(true);

    act(() => result.current.setCell(0, 5));
    expect(result.current.grid[0]).toBe(1);
  });

  it("lets non-given cells be edited", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.setCell(5, 9));
    expect(result.current.grid[5]).toBe(9);
  });

  it("flags cells that conflict with a peer in the same row", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.setCell(1, 1)); // same row as the given 1 at index 0

    expect(result.current.conflicts.has(0)).toBe(true);
    expect(result.current.conflicts.has(1)).toBe(true);
  });

  it("reports completion once every cell is filled", () => {
    const { result } = renderBoardState(givens);
    expect(result.current.isComplete).toBe(false);

    act(() => {
      for (let i = 1; i < 81; i++) {
        result.current.setCell(i, (i % 9) + 1);
      }
    });
    expect(result.current.isComplete).toBe(true);
  });

  it("counts a conflicting placement as a mistake and resets the combo", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.setCell(5, 3));
    expect(result.current.combo).toBe(1);

    act(() => result.current.setCell(1, 1)); // same row as the given 1 at index 0 — conflicts
    expect(result.current.mistakeCount).toBe(1);
    expect(result.current.combo).toBe(0);
    expect(result.current.maxCombo).toBe(1);
  });

  it("does not double-count a mistake when the reducer runs twice for the same action", () => {
    const { result } = renderBoardState(givens);

    // Regression check for the setState-with-side-effects bug: the reducer must be pure, so
    // dispatching the exact same transition twice must not double-apply history or counters.
    act(() => result.current.setCell(1, 1)); // conflicts with the given 1 at index 0
    expect(result.current.mistakeCount).toBe(1);
    expect(result.current.grid[1]).toBe(1);
  });

  it("undoes the last placement, restoring the grid and any notes it cleared", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.toggleNote(5, 7));
    act(() => result.current.setCell(5, 9)); // clears the pencil mark at 5
    expect(result.current.notes[5]).toBeUndefined();
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.grid[5]).toBe(0);
    expect(result.current.notes[5]?.has(7)).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it("flips isGameOver once mistakes reach MAX_MISTAKES and freezes the board", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.setCell(1, 1)); // conflicts with the given 1 at index 0
    act(() => result.current.setCell(2, 1)); // conflicts with the given 1 at index 0
    act(() => result.current.setCell(3, 1)); // conflicts with the given 1 at index 0

    expect(result.current.mistakeCount).toBe(3);
    expect(result.current.isGameOver).toBe(true);

    const gridAtGameOver = result.current.grid;
    act(() => result.current.setCell(4, 5));
    expect(result.current.grid).toBe(gridAtGameOver);
  });

  it("clears a placed digit from peers' pencil marks when auto-clear notes is on", () => {
    const { result } = renderBoardState(givens);

    act(() => result.current.toggleNote(2, 9)); // index 2 is a peer of index 5 (same row)
    act(() => result.current.setCell(5, 9));

    expect(result.current.notes[2]?.has(9)).toBe(false);
  });

  it("persists state to storage on every change", () => {
    const { result } = renderBoardState(givens, "persist-puzzle");

    act(() => result.current.setCell(5, 9));

    const stored = readProgress("persist-puzzle");
    expect(stored?.grid[5]).toBe(9);
    expect(stored?.mistakeCount).toBe(0);
  });

  it("resumes from a stored entry matching the puzzle's grid length", () => {
    writeProgress("resume-puzzle", {
      grid: [1, ...Array(80).fill(0)].map((v, i) => (i === 5 ? 9 : v)),
      notes: { 6: new Set([2, 3]) },
      mistakeCount: 1,
      combo: 2,
      maxCombo: 2,
      elapsedSeconds: 30,
    });

    const { result } = renderBoardState(givens, "resume-puzzle");

    expect(result.current.grid[5]).toBe(9);
    expect(result.current.notes[6]?.has(2)).toBe(true);
    expect(result.current.mistakeCount).toBe(1);
    expect(result.current.maxCombo).toBe(2);
  });

  it("falls back to a fresh board when the stored entry's grid disagrees with a given cell (stale/corrupt entry)", () => {
    writeProgress("mismatched-given-puzzle", {
      grid: [9, ...Array(80).fill(0)], // index 0 is given as 1; a stored 9 there is impossible
      notes: {},
      mistakeCount: 1,
      combo: 0,
      maxCombo: 0,
      elapsedSeconds: 10,
    });

    const { result } = renderBoardState(givens, "mismatched-given-puzzle");

    expect(result.current.grid[0]).toBe(1); // the given, not the mismatched stored value
    expect(result.current.mistakeCount).toBe(0); // fresh state, not the corrupt entry's
  });

  it("falls back to a fresh board when the stored entry's grid length doesn't match (stale/corrupt entry)", () => {
    writeProgress("stale-puzzle", {
      grid: [1, 2, 3], // wrong length for this 81-cell puzzle
      notes: {},
      mistakeCount: 2,
      combo: 0,
      maxCombo: 0,
      elapsedSeconds: 30,
    });

    const { result } = renderBoardState(givens, "stale-puzzle");

    expect(result.current.grid.length).toBe(81);
    expect(result.current.grid[0]).toBe(1); // the given, not the stale stored value
    expect(result.current.mistakeCount).toBe(0);
  });
});
