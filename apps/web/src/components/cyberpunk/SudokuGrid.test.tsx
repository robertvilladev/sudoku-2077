import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SettingsProvider } from "../../lib/settings/SettingsContext.js";
import { useBoardState } from "../../features/puzzle/useBoardState.js";
import { SudokuGrid } from "./SudokuGrid.js";

const givens = `1${"0".repeat(80)}`;

function Harness() {
  const board = useBoardState(givens);
  return <SudokuGrid board={board} />;
}

function renderGrid() {
  return render(
    <SettingsProvider>
      <Harness />
    </SettingsProvider>
  );
}

describe("SudokuGrid", () => {
  it("renders given cells as read-only and non-given cells as empty", () => {
    renderGrid();
    expect(screen.getByLabelText("Cell 1")).toHaveAttribute("data-state", "given");
    expect(screen.getAllByLabelText("Cell empty").length).toBeGreaterThan(0);
  });

  it("lets a selected non-given cell accept a digit via the keyboard", async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getAllByLabelText("Cell empty")[0]);
    await user.keyboard("9");

    expect(screen.getByLabelText("Cell 9")).toBeInTheDocument();
  });

  it("marks a cell that conflicts with a peer", async () => {
    const user = userEvent.setup();
    renderGrid();

    // Index 1 is in the same row as the given "1" at index 0 — placing 1 there conflicts.
    const cells = screen.getAllByRole("gridcell");
    await user.click(cells[1]);
    await user.keyboard("1");

    expect(cells[1]).toHaveAttribute("data-state", "conflict");
  });
});
