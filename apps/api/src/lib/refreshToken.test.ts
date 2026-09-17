import { describe, expect, it } from "vitest";
import { generateRefreshToken, hashRefreshToken } from "./refreshToken.js";

describe("refreshToken", () => {
  it("generates a high-entropy, url-safe token", () => {
    const token = generateRefreshToken();
    expect(token.length).toBeGreaterThanOrEqual(43); // base64url of 32 random bytes
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct tokens on each call", () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });

  it("hashes deterministically", () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(hashRefreshToken(generateRefreshToken()));
  });
});
