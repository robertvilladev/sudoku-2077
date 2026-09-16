import { LightningIcon } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { useSettings } from "../../lib/settings/SettingsContext.js";

export function ComboBadge({ combo }: { combo: number }) {
  const { scanlineOn } = useSettings();

  if (combo < 2) return null;

  const getGlowClass = () => {
    if (combo >= 10) return clsx("glow-text-combo-tier3", scanlineOn && "glow-text-combo-pulse");
    if (combo >= 5) return "glow-text-combo-tier2";
    return "glow-text-combo-tier1";
  };

  const badge = (
    <span className={clsx("flex items-center gap-1 font-mono text-[13px] text-accent-300", getGlowClass())}>
      <LightningIcon weight="fill" />
      COMBO ×{combo}
    </span>
  );

  if (combo >= 10 && scanlineOn) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}
