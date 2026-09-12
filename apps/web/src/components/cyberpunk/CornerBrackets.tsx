const POSITIONS = [
  "top-[-6px] left-[-6px] border-t-2 border-l-2",
  "top-[-6px] right-[-6px] border-t-2 border-r-2",
  "bottom-[-6px] left-[-6px] border-b-2 border-l-2",
  "bottom-[-6px] right-[-6px] border-b-2 border-r-2",
];

export function CornerBrackets() {
  return (
    <>
      {POSITIONS.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={`pointer-events-none absolute size-4 border-accent ${position}`}
        />
      ))}
    </>
  );
}
