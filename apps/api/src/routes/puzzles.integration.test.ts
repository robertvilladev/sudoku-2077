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

describe("POST /api/puzzles/:id/validate — completion recording", () => {
  async function createUserAndToken(app: Awaited<ReturnType<typeof buildApp>>) {
    const email = `validate-test-${randomUUID()}@example.com`;
    const signup = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email, password: "hunter2222" },
    });
    return { email, accessToken: signup.json().accessToken as string };
  }

  async function deleteUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.puzzleCompletion.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  afterEach(async () => {
    await prisma.puzzleCompletion.deleteMany({ where: { puzzle: { givens } } });
  });

  it("records a completion for an authenticated correct solve", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const { email, accessToken } = await createUserAndToken(app);

    const response = await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { board: solution, timeSeconds: 42, mistakeCount: 1, maxCombo: 5 },
    });
    expect(response.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    const completions = await prisma.puzzleCompletion.findMany({ where: { puzzleId: puzzle.id, userId: user!.id } });
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ timeSeconds: 42, mistakeCount: 1, maxCombo: 5 });

    await deleteUserByEmail(email);
  });

  it("does not record a completion for an anonymous solve", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();

    await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      payload: { board: solution },
    });

    const completions = await prisma.puzzleCompletion.findMany({ where: { puzzleId: puzzle.id } });
    expect(completions).toHaveLength(0);
  });

  it("does not record a completion for an incorrect (authenticated) submission", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const { email, accessToken } = await createUserAndToken(app);

    await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { board: "9".repeat(81) },
    });

    const completions = await prisma.puzzleCompletion.findMany({ where: { puzzleId: puzzle.id } });
    expect(completions).toHaveLength(0);

    await deleteUserByEmail(email);
  });
});
