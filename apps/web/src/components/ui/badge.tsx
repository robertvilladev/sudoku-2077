import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[calc(var(--radius-md)*0.75)] border border-transparent px-2.5 py-0.5 font-mono text-[11px] tracking-wide whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        accent: "bg-accent-800 text-accent-100",
        neutral: "bg-neutral-800 text-neutral-100",
        outline: "border-accent text-accent",
      },
    },
    defaultVariants: {
      variant: "accent",
    },
  }
);

function Badge({
  className,
  variant = "accent",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
