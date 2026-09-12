import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useSettings } from "../../lib/settings/SettingsContext.js";

// CRT power-on flicker on route mount — one of the ambient effects gated by the
// CRT SCANLINE EFFECT setting (see SettingsContext for why its scope is wider than its label).
export function PageFlicker({ children }: { children: ReactNode }) {
  const { scanlineOn } = useSettings();

  if (!scanlineOn) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, filter: "brightness(2)" }}
      animate={{ opacity: 1, filter: "brightness(1)" }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
