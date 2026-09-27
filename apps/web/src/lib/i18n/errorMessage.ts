import type { IntlShape } from "react-intl";
import type { ErrorCode } from "@sudoku-2077/api-types";
import { ApiError } from "../apiClient.js";

type MessageId = FormatjsIntl.Message["ids"];

const MESSAGE_FOR_CODE: Partial<Record<ErrorCode, MessageId>> = {
  AUTH_INVALID_CREDENTIALS: "errorInvalidCredentials",
  AUTH_EMAIL_TAKEN: "errorEmailTaken",
  VALIDATION_FAILED: "errorValidationFailed",
  NOT_FOUND: "errorNotFound",
  NO_PUZZLES_AVAILABLE: "errorNoPuzzles",
  RATE_LIMITED: "errorRateLimited",
  INTERNAL_ERROR: "errorServer",
};

// The server's `error` text is an English developer message, so it is never shown to players.
export function errorMessage(intl: IntlShape, error: unknown, fallback: MessageId): string {
  const id = error instanceof ApiError && error.code ? MESSAGE_FOR_CODE[error.code] : undefined;
  return intl.formatMessage({ id: id ?? fallback });
}
