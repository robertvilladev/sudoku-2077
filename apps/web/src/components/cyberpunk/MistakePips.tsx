import { useIntl } from "react-intl";
import { MAX_MISTAKES } from "../../features/puzzle/useBoardState.js";

export function MistakePips({ count }: { count: number }) {
  const intl = useIntl();
  return (
    <div
      role="status"
      className="flex gap-1"
      aria-label={intl.formatMessage({ id: "hudMistakesLabel" }, { count, max: MAX_MISTAKES })}
    >
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
