import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  DailyChallengeResponseSchema,
  ErrorResponseSchema,
  GetPuzzlesQuerySchema,
  PublicPuzzleSchema,
  ValidatePuzzleRequestSchema,
  ValidatePuzzleResponseSchema,
} from "@sudoku-2077/api-types";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const PuzzleIdParamsSchema = z.object({ id: z.string().openapi({ description: "Puzzle id" }) });

registry.registerPath({
  method: "get",
  path: "/api/daily-challenge",
  description: "Today's daily challenge puzzle (UTC), givens only.",
  responses: {
    200: { description: "The daily challenge", content: { "application/json": { schema: DailyChallengeResponseSchema } } },
    404: { description: "No daily challenge assigned yet", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/puzzles",
  description: "One puzzle from the given difficulty tier's pool, givens only.",
  request: { query: GetPuzzlesQuerySchema },
  responses: {
    200: { description: "A puzzle", content: { "application/json": { schema: PublicPuzzleSchema } } },
    400: { description: "Invalid or missing difficulty", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "No puzzles available for that tier", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/puzzles/{id}",
  description: "A specific puzzle by id, givens only.",
  request: { params: PuzzleIdParamsSchema },
  responses: {
    200: { description: "A puzzle", content: { "application/json": { schema: PublicPuzzleSchema } } },
    404: { description: "Puzzle not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/puzzles/{id}/validate",
  description: "Validate a submitted board against the stored solution, server-side.",
  request: {
    params: PuzzleIdParamsSchema,
    body: { content: { "application/json": { schema: ValidatePuzzleRequestSchema } } },
  },
  responses: {
    200: { description: "Validation result", content: { "application/json": { schema: ValidatePuzzleResponseSchema } } },
    400: { description: "Malformed board", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Puzzle not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "sudoku-2077 API", version: "0.0.0" },
  });
}
