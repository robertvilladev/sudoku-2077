import { createHash, randomBytes } from "node:crypto";

// Opaque, high-entropy token handed to the client (in an httpOnly cookie). Only its hash is ever
// persisted, so a DB leak alone never yields a usable refresh token.
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
