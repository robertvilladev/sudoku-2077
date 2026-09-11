import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Board } from "./Board.js";

describe("Board", () => {
  it("renders given cells as read-only and reports edits on editable cells", async () => {
    const grid = [1, 0, ...Array(79).fill(0)];
    const givenMask = [true, false, ...Array(79).fill(false)];
    const onCellChange = vi.fn();

    render(<Board grid={grid} givenMask={givenMask} conflicts={new Set()} onCellChange={onCellChange} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveValue("1");
    expect(cells[0]).toHaveAttribute("readonly");

    await userEvent.type(cells[1], "7");
    expect(onCellChange).toHaveBeenCalledWith(1, 7);
  });

  it("marks conflicting cells", () => {
    const grid = [1, 1, ...Array(79).fill(0)];
    const givenMask = Array(81).fill(false);

    render(<Board grid={grid} givenMask={givenMask} conflicts={new Set([0, 1])} onCellChange={vi.fn()} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0].className).toMatch(/conflict/);
    expect(cells[1].className).toMatch(/conflict/);
  });
});
