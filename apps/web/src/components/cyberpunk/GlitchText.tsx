import { motion } from "motion/react";
import { forwardRef, type ComponentProps } from "react";
import { useSettings } from "../../lib/settings/SettingsContext.js";

type GlitchTextProps = Omit<
  ComponentProps<"span">,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
>;

// Brief jitter on mount — used for the win title and a cell's digit the instant it becomes a conflict.
// Forwards all props (id, aria-*, ...) and its ref so it works as a Radix `asChild` target (DialogTitle).
export const GlitchText = forwardRef<HTMLSpanElement, GlitchTextProps>(function GlitchText(
  props,
  ref
) {
  const { scanlineOn } = useSettings();

  if (!scanlineOn) return <span ref={ref} {...props} />;

  return (
    <motion.span
      ref={ref}
      {...props}
      initial={{ x: 0 }}
      animate={{ x: [0, -2, 2, 0] }}
      transition={{ duration: 0.2 }}
    />
  );
});
