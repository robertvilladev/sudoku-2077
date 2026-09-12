import { motion } from "motion/react";
import type { ComponentProps } from "react";
import { useSettings } from "../../lib/settings/SettingsContext.js";

type GlitchTextProps = Omit<
  ComponentProps<"span">,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
>;

// Brief jitter on mount — used for the win title and a cell's digit the instant it becomes a conflict.
// Forwards all props (id, aria-*, ...) so it works as a Radix `asChild` target.
export function GlitchText(props: GlitchTextProps) {
  const { scanlineOn } = useSettings();

  if (!scanlineOn) return <span {...props} />;

  return (
    <motion.span
      {...props}
      initial={{ x: 0 }}
      animate={{ x: [0, -2, 2, 0] }}
      transition={{ duration: 0.2 }}
    />
  );
}
