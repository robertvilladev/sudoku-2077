import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

describe("parseEnv", () => {
  it("applies defaults when optional vars are absent", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db" });
    expect(env.PORT).toBe(3000);
    expect(env.MIN_POOL_SIZE).toBe(20);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it("parses CORS_ORIGINS as a comma-separated list", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      CORS_ORIGINS: "http://localhost:5173,https://sudoku-2077.example.com",
    });
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:5173", "https://sudoku-2077.example.com"]);
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow();
  });

  it("throws when PORT is not a positive integer", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db", PORT: "not-a-number" })
    ).toThrow();
  });
});
