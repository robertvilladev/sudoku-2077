import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

const solution = "1".repeat(81);
const givens = "1".repeat(30) + "0".repeat(51);

async function seedPuzzle() {
  return prisma.puzzle.create({
    data: {
      id: randomUUID(),
      givens,
      solution,
      difficulty: "EASY",
      difficultyScore: 1,
      techniques: ["nakedSingle"],
      givensCount: 30,
    },
  });
}

afterEach(async () => {
  await prisma.puzzle.deleteMany({ where: { givens } });
});

describe("GET /api/puzzles/:id", () => {
  it("returns the puzzle's givens, not its solution", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: `/api/puzzles/${puzzle.id}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.givens).toBe(givens);
    expect(body.solution).toBeUndefined();
  });

  it("returns 404 for an id that doesn't exist", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: `/api/puzzles/${randomUUID()}` });
    expect(response.statusCode).toBe(404);
  });
});

describe("POST /api/puzzles/:id/validate", () => {
  it("returns correct: true when the submitted board matches the solution", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      payload: { board: solution },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ correct: true, completed: true });
  });

  it("returns 400 for a malformed board", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      payload: { board: "too-short" },
    });
    expect(response.statusCode).toBe(400);
  });
});
