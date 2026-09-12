const MAX_MISTAKES = 3;

export function MistakePips({ count }: { count: number }) {
  return (
    <div role="status" className="flex gap-1" aria-label={`${count} of ${MAX_MISTAKES} mistakes used`}>
      {Array.from({ length: MAX_MISTAKES }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            i < count
              ? "size-[11px] rounded-[2px] bg-[oklch(66%_0.16_25)]"
              : "size-[11px] rounded-[2px] border-[1.5px] border-[color:var(--divider)]"
          }
        />
      ))}
    </div>
  );
}
