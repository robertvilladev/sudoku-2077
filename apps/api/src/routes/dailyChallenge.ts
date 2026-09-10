import type { FastifyInstance } from "fastify";
import type { DailyChallengeResponse } from "@sudoku-2077/api-types";
import { prisma } from "../db/client.js";
import { toPublicPuzzle } from "../mappers.js";

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function dailyChallengeRoutes(app: FastifyInstance) {
  app.get("/api/daily-challenge", async (_request, reply) => {
    const date = todayUtc();
    const daily = await prisma.dailyChallenge.findUnique({
      where: { date },
      include: { puzzle: true },
    });

    if (!daily) {
      reply.code(404);
      return { error: "No daily challenge is assigned for today yet. Run the replenish job." };
    }

    const response: DailyChallengeResponse = {
      date: date.toISOString().slice(0, 10),
      puzzle: toPublicPuzzle(daily.puzzle),
    };
    return response;
  });
}
