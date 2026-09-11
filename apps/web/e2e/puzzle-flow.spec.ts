import { expect, test } from "@playwright/test";

// Smoke test only — assumes apps/api is running locally with a replenished pool
// (see repo README "Setup"). Not run in CI yet (Phase 0 wires that up).
test("solving flow: pick a difficulty, load a puzzle, see the board", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EASY" }).click();
  await expect(page).toHaveURL(/\/puzzles\//);
  await expect(page.getByRole("button", { name: /check solution/i })).toBeVisible();
});
