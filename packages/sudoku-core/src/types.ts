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

export const TechniqueName = {
  NAKED_SINGLE: "NAKED_SINGLE",
  HIDDEN_SINGLE: "HIDDEN_SINGLE",
  NAKED_PAIR: "NAKED_PAIR",
  POINTING_PAIR: "POINTING_PAIR",
  X_WING: "X_WING",
} as const;
export type TechniqueName = (typeof TechniqueName)[keyof typeof TechniqueName];

export interface Puzzle {
  givens: string; // 81-char string, '0' = blank
  solution: string; // 81-char string
  difficulty: Difficulty;
  difficultyScore: number;
  techniques: TechniqueName[];
  givensCount: number;
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
