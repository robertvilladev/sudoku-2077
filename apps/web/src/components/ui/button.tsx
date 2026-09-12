import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { motion } from "motion/react";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent bg-transparent bg-clip-padding font-mono text-sm font-medium whitespace-nowrap transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-accent text-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)]",
        secondary:
          "border-[color:var(--divider)] text-foreground hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
        ghost:
          "text-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]",
      },
      size: {
        default: "h-8 px-3",
        icon: "size-9 p-0",
        stack: "h-auto flex-col gap-1 px-2 py-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: Omit<
  React.ComponentProps<"button">,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
