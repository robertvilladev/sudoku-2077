import type { z } from "zod";
import { ErrorResponseSchema } from "@sudoku-2077/api-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsedError = ErrorResponseSchema.safeParse(body);
    throw new ApiError(parsedError.success ? parsedError.data.error : "Request failed", response.status);
  }

  return schema.parse(body);
}

// Every response is parsed against the same Zod schemas apps/api uses to build it — the client-side
// half of the contract, so a drift between backend and frontend fails loudly instead of silently.
export function getJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  return request(path, schema, init);
}

export function postJson<T>(
  path: string,
  schema: z.ZodType<T>,
  body: unknown,
  init: RequestInit = {}
): Promise<T> {
  return request(path, schema, { ...init, method: "POST", body: JSON.stringify(body) });
}
