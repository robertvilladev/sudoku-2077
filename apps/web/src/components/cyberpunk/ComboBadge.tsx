import { LightningIcon } from "@phosphor-icons/react";

export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;

  return (
    <span className="flex items-center gap-1 font-mono text-[13px] text-accent-300">
      <LightningIcon weight="fill" />
      COMBO ×{combo}
    </span>
  );
}
