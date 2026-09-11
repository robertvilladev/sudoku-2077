import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GetPuzzlesQuerySchema, ValidatePuzzleRequestSchema } from "@sudoku-2077/api-types";
import type { PublicPuzzle, ValidatePuzzleResponse } from "@sudoku-2077/api-types";
import { prisma } from "../db/client.js";
import { toPublicPuzzle } from "../mappers.js";

const PuzzleIdParamsSchema = z.object({ id: z.string().min(1) });

export async function puzzleRoutes(app: FastifyInstance) {
  // Pulls one puzzle from the pre-generated pool for the requested tier (least-served first, so the
  // pool cycles evenly rather than always handing out the newest rows).
  app.get("/api/puzzles", async (request, reply) => {
    const parsed = GetPuzzlesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid or missing 'difficulty' query parameter" };
    }

    const puzzle = await prisma.puzzle.findFirst({
      where: { difficulty: parsed.data.difficulty },
      orderBy: { servedCount: "asc" },
    });

    if (!puzzle) {
      reply.code(404);
      return { error: `No puzzles available for difficulty ${parsed.data.difficulty}. Run the replenish job.` };
    }

    await prisma.puzzle.update({
      where: { id: puzzle.id },
      data: { servedCount: { increment: 1 } },
    });

    const response: PublicPuzzle = toPublicPuzzle(puzzle);
    return response;
  });

  app.get("/api/puzzles/:id", async (request, reply) => {
    const params = PuzzleIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400);
      return { error: "Invalid puzzle id" };
    }
    const { id } = params.data;
    const puzzle = await prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) {
      reply.code(404);
      return { error: "Puzzle not found" };
    }
    const response: PublicPuzzle = toPublicPuzzle(puzzle);
    return response;
  });

  // Checks a submitted board against the stored solution server-side so the solution never has to
  // leave the server before the player actually finishes the puzzle.
  app.post("/api/puzzles/:id/validate", async (request, reply) => {
    const params = PuzzleIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      reply.code(400);
      return { error: "Invalid puzzle id" };
    }
    const { id } = params.data;
    const parsed = ValidatePuzzleRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Body must be { board: <81-char string> }" };
    }

    const puzzle = await prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) {
      reply.code(404);
      return { error: "Puzzle not found" };
    }

    const completed = !parsed.data.board.includes("0");
    const correct = parsed.data.board === puzzle.solution;

    const response: ValidatePuzzleResponse = { correct, completed };
    return response;
  });
}
