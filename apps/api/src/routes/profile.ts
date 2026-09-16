import type { FastifyInstance } from "fastify";
import type { CompletionsResponse } from "@sudoku-2077/api-types";
import { prisma } from "../db/client.js";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile/completions", { preHandler: app.authenticate }, async (request) => {
    const completions = await prisma.puzzleCompletion.findMany({
      where: { userId: request.user.sub },
      orderBy: { completedAt: "desc" },
      include: { puzzle: { select: { difficulty: true } } },
    });

    const response: CompletionsResponse = completions.map((completion) => ({
      puzzleId: completion.puzzleId,
      difficulty: completion.puzzle.difficulty,
      completedAt: completion.completedAt.toISOString(),
      timeSeconds: completion.timeSeconds,
      mistakeCount: completion.mistakeCount,
      maxCombo: completion.maxCombo,
    }));
    return response;
  });
}
