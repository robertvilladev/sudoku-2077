import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

const solution = "1".repeat(81);
const givens = "1".repeat(30) + "0".repeat(51);

async function seedPuzzle() {
  return prisma.puzzle.create({
    data: { id: randomUUID(), givens, solution, difficulty: "EASY", difficultyScore: 1, techniques: [], givensCount: 30 },
  });
}

afterEach(async () => {
  await prisma.puzzleCompletion.deleteMany({ where: { puzzle: { givens } } });
  await prisma.puzzle.deleteMany({ where: { givens } });
});

describe("GET /api/profile/completions", () => {
  it("requires authentication", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/profile/completions" });
    expect(response.statusCode).toBe(401);
  });

  it("returns only the caller's own completions", async () => {
    const app = await buildApp();
    const puzzle = await seedPuzzle();

    const emailA = `profile-a-${randomUUID()}@example.com`;
    const emailB = `profile-b-${randomUUID()}@example.com`;
    const signupA = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email: emailA, password: "hunter2222" } });
    const signupB = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email: emailB, password: "hunter2222" } });
    const tokenA = signupA.json().accessToken as string;
    const tokenB = signupB.json().accessToken as string;

    await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { board: solution, timeSeconds: 10, mistakeCount: 0, maxCombo: 3 },
    });

    const responseA = await app.inject({
      method: "GET",
      url: "/api/profile/completions",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(responseA.statusCode).toBe(200);
    expect(responseA.json()).toEqual([
      expect.objectContaining({ puzzleId: puzzle.id, difficulty: "EASY", timeSeconds: 10, mistakeCount: 0, maxCombo: 3 }),
    ]);

    const responseB = await app.inject({
      method: "GET",
      url: "/api/profile/completions",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(responseB.statusCode).toBe(200);
    expect(responseB.json()).toEqual([]);

    const userA = await prisma.user.findUnique({ where: { email: emailA } });
    const userB = await prisma.user.findUnique({ where: { email: emailB } });
    const userIds = [userA!.id, userB!.id];
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.puzzleCompletion.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });
});
