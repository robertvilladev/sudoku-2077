import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/sudoku_2077?schema=public",
    },
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
