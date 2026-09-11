import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBoardState } from "./useBoardState.js";

describe("useBoardState", () => {
  const givens = `1${"0".repeat(80)}`;

  it("marks given cells and refuses to modify them", () => {
    const { result } = renderHook(() => useBoardState(givens));
    expect(result.current.givenMask[0]).toBe(true);

    act(() => result.current.setCell(0, 5));
    expect(result.current.grid[0]).toBe(1);
  });

  it("lets non-given cells be edited", () => {
    const { result } = renderHook(() => useBoardState(givens));

    act(() => result.current.setCell(5, 9));
    expect(result.current.grid[5]).toBe(9);
  });

  it("flags cells that conflict with a peer in the same row", () => {
    const { result } = renderHook(() => useBoardState(givens));

    act(() => result.current.setCell(1, 1)); // same row as the given 1 at index 0

    expect(result.current.conflicts.has(0)).toBe(true);
    expect(result.current.conflicts.has(1)).toBe(true);
  });

  it("reports completion once every cell is filled", () => {
    const { result } = renderHook(() => useBoardState(givens));
    expect(result.current.isComplete).toBe(false);

    act(() => {
      for (let i = 1; i < 81; i++) {
        result.current.setCell(i, (i % 9) + 1);
      }
    });
    expect(result.current.isComplete).toBe(true);
  });
});
