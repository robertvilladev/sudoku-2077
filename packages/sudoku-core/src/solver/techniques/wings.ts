import { Grid } from "../../types.js";
import { Candidates, PEER_SETS } from "../candidates.js";

function eliminateFromCommonPeers(
  grid: Grid,
  candidates: Candidates,
  cells: number[],
  digit: number
): boolean {
  let changed = false;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0 || cells.includes(i)) continue;
    if (cells.every((c) => PEER_SETS[c].has(i)) && candidates[i].delete(digit)) changed = true;
  }
  return changed;
}

/**
 * XY-Wing: a pivot {x,y} sees pincers {x,z} and {y,z}. Whichever value the pivot takes, one pincer
 * becomes z — so z can be removed from every cell that sees both pincers.
 */
export function applyXYWing(grid: Grid, candidates: Candidates): boolean {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (grid[pivot] !== 0 || candidates[pivot].size !== 2) continue;
    const [x, y] = candidates[pivot];
    const pincers = [...PEER_SETS[pivot]].filter((i) => grid[i] === 0 && candidates[i].size === 2);

    for (const a of pincers) {
      if (!candidates[a].has(x) || candidates[a].has(y)) continue;
      const z = [...candidates[a]].find((v) => v !== x)!;
      for (const b of pincers) {
        if (b === a || !candidates[b].has(y) || !candidates[b].has(z)) continue;
        if (eliminateFromCommonPeers(grid, candidates, [a, b], z)) return true;
      }
    }
  }
  return false;
}

/**
 * XYZ-Wing: a pivot {x,y,z} sees pincers {x,z} and {y,z}. One of the three must be z, so z can be
 * removed from every cell that sees the pivot and both pincers.
 */
export function applyXYZWing(grid: Grid, candidates: Candidates): boolean {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (grid[pivot] !== 0 || candidates[pivot].size !== 3) continue;
    const pivotSet = candidates[pivot];
    const pincers = [...PEER_SETS[pivot]].filter(
      (i) => grid[i] === 0 && candidates[i].size === 2 && [...candidates[i]].every((v) => pivotSet.has(v))
    );

    for (let p = 0; p < pincers.length; p++) {
      for (let q = p + 1; q < pincers.length; q++) {
        const a = candidates[pincers[p]];
        const b = candidates[pincers[q]];
        const shared = [...a].filter((v) => b.has(v));
        if (shared.length !== 1) continue; // identical pincers would be a naked pair, not a wing
        if (eliminateFromCommonPeers(grid, candidates, [pivot, pincers[p], pincers[q]], shared[0]))
          return true;
      }
    }
  }
  return false;
}
