import type { DifficultyTier } from "@sudoku-2077/api-types";

type MessageId = FormatjsIntl.Message["ids"];

// The wire value (EASY, HARDCORE) is never shown; these are the display labels.
export const DIFFICULTY_LABEL: Record<DifficultyTier, MessageId> = {
  EASY: "difficultyEasy",
  MEDIUM: "difficultyMedium",
  HARD: "difficultyHard",
  HARDCORE: "difficultyHardcore",
};

export const DIFFICULTY_CODENAME: Record<DifficultyTier, MessageId> = {
  EASY: "difficultyEasyCodename",
  MEDIUM: "difficultyMediumCodename",
  HARD: "difficultyHardCodename",
  HARDCORE: "difficultyHardcoreCodename",
};
