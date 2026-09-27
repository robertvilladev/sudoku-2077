import type { FastifyError, FastifyInstance } from "fastify";
import type { ErrorCode, ErrorResponse } from "@sudoku-2077/api-types";

export function errorBody(code: ErrorCode, error: string): ErrorResponse {
  return { code, error };
}

function codeForStatus(statusCode: number): ErrorCode {
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 429) return "RATE_LIMITED";
  return "BAD_REQUEST";
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error(error);
      reply.code(500).send(errorBody("INTERNAL_ERROR", "Internal server error"));
      return;
    }
    reply.code(statusCode).send(errorBody(codeForStatus(statusCode), error.message));
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(errorBody("NOT_FOUND", `Route ${request.method} ${request.url} not found`));
  });
}
