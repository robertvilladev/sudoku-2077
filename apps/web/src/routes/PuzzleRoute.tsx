import { useParams } from "react-router-dom";
import { Board } from "../features/puzzle/Board.js";
import { usePuzzle, useValidatePuzzle } from "../features/puzzle/api.js";
import { useBoardState } from "../features/puzzle/useBoardState.js";

export function PuzzleRoute() {
  const { id = "" } = useParams();
  const { data: puzzle, isLoading } = usePuzzle(id);

  if (isLoading) return <p>Loading puzzle…</p>;
  if (!puzzle) return <p>Puzzle not found.</p>;

  return <PuzzleBoard puzzleId={puzzle.id} givens={puzzle.givens} />;
}

function PuzzleBoard({ puzzleId, givens }: { puzzleId: string; givens: string }) {
  const board = useBoardState(givens);
  const validate = useValidatePuzzle(puzzleId);

  return (
    <div>
      <Board
        grid={board.grid}
        givenMask={board.givenMask}
        conflicts={board.conflicts}
        onCellChange={board.setCell}
      />
      <button disabled={!board.isComplete} onClick={() => validate.mutate(board.boardString)}>
        Check solution
      </button>
      {validate.data && <p>{validate.data.correct ? "Correct! 🎉" : "Not quite right yet."}</p>}
    </div>
  );
}
