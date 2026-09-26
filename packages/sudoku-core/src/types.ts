export type Grid = number[]; // length 81, 0 = blank

export const GRID_SIZE = 81;

// Plain string-literal unions (not TS `enum`) so these match Prisma's generated enum types and
// @sudoku-2077/api-types' zod-inferred types structurally, with no casting needed at the boundaries.
export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  HARDCORE: "HARDCORE",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// Stored as plain strings in Puzzle.techniques (a String[] column), so adding a technique needs no migration.
export const TechniqueName = {
  HIDDEN_SINGLE: "HIDDEN_SINGLE",
  NAKED_SINGLE: "NAKED_SINGLE",
  POINTING_PAIR: "POINTING_PAIR",
  BOX_LINE_REDUCTION: "BOX_LINE_REDUCTION",
  NAKED_PAIR: "NAKED_PAIR",
  HIDDEN_PAIR: "HIDDEN_PAIR",
  X_WING: "X_WING",
  NAKED_TRIPLE: "NAKED_TRIPLE",
  SWORDFISH: "SWORDFISH",
  HIDDEN_TRIPLE: "HIDDEN_TRIPLE",
  XY_WING: "XY_WING",
  XYZ_WING: "XYZ_WING",
  NAKED_QUAD: "NAKED_QUAD",
} as const;
export type TechniqueName = (typeof TechniqueName)[keyof typeof TechniqueName];

export interface Puzzle {
  givens: string; // 81-char string, '0' = blank
  solution: string; // 81-char string
  difficulty: Difficulty;
  difficultyScore: number;
  techniques: TechniqueName[];
  givensCount: number;
  /** Seed that regenerates this exact puzzle via `createPuzzle({ seed })`. */
  seed: string;
}

export function rowOf(index: number): number {
  return Math.floor(index / 9);
}

export function colOf(index: number): number {
  return index % 9;
}

export function boxOf(index: number): number {
  const r = rowOf(index);
  const c = colOf(index);
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

export function indexOf(row: number, col: number): number {
  return row * 9 + col;
}

export function cellsInRow(row: number): number[] {
  return Array.from({ length: 9 }, (_, c) => indexOf(row, c));
}

export function cellsInCol(col: number): number[] {
  return Array.from({ length: 9 }, (_, r) => indexOf(r, col));
}

export function cellsInBox(box: number): number[] {
  const boxRow = Math.floor(box / 3) * 3;
  const boxCol = (box % 3) * 3;
  const cells: number[] = [];
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      cells.push(indexOf(r, c));
    }
  }
  return cells;
}

export function peersOf(index: number): number[] {
  const peers = new Set<number>();
  for (const i of cellsInRow(rowOf(index))) peers.add(i);
  for (const i of cellsInCol(colOf(index))) peers.add(i);
  for (const i of cellsInBox(boxOf(index))) peers.add(i);
  peers.delete(index);
  return Array.from(peers);
}

export function gridToString(grid: Grid): string {
  return grid.map((v) => String(v)).join("");
}

export function stringToGrid(s: string): Grid {
  if (s.length !== GRID_SIZE) {
    throw new Error(`Expected an ${GRID_SIZE}-character puzzle string, got ${s.length}`);
  }
  return s.split("").map((ch) => {
    const n = ch === "." ? 0 : Number(ch);
    if (Number.isNaN(n) || n < 0 || n > 9) {
      throw new Error(`Invalid character "${ch}" in puzzle string`);
    }
    return n;
  });
}

export function cloneGrid(grid: Grid): Grid {
  return grid.slice();
}
