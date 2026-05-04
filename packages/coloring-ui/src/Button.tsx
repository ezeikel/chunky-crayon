"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import cn from "./cn";

/**
 * Brand-themed Button shared by all One Colored Pixel apps. Uses
 * `--color-coloring-*` tokens so a single component renders the chunky/bouncy
 * Chunky Crayon look or the airy Coloring Habitat look depending on the
 * surrounding `data-theme` (or app-level token overrides).
 *
 * API mirrors the shadcn `<Button>` it replaces: same variant + size names,
 * same `asChild` slot pattern, same forwardRef. Existing call sites that pass
 * `variant="outline"` or `size="sm"` keep working.
 *
 * Variants map to the toast palette where it makes sense — `destructive` is
 * the error-pink, `success` is the success-green — so an action button next
 * to a toast reads as the same brand family.
 */

const baseClasses = [
  "inline-flex items-center justify-center gap-2",
  "whitespace-nowrap select-none",
  "font-[var(--font-coloring-body)] font-[var(--coloring-weight-emphasis,700)]",
  "rounded-coloring-button",
  "transition-[transform,box-shadow,background-color,color]",
  "duration-[var(--duration-coloring-base,200ms)]",
  "ease-[var(--ease-coloring,cubic-bezier(0.34,1.56,0.64,1))]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "focus-visible:ring-coloring-accent focus-visible:ring-offset-coloring-surface",
  "disabled:pointer-events-none disabled:opacity-50",
  "active:translate-y-[2px]",
  // Brand "chunky lift" — bottom-only drop. Variant CSS sets `--bottom`
  // to its dark-tone token. Active state collapses the lift.
  "shadow-[0_6px_0_0_var(--bottom),0_10px_24px_-8px_rgb(0_0_0/0.18)]",
  "active:shadow-[0_3px_0_0_var(--bottom),0_6px_16px_-8px_rgb(0_0_0/0.18)]",
].join(" ");

const buttonVariants = cva(baseClasses, {
  variants: {
    variant: {
      // Default brand accent (CC: chunky orange, CH: green)
      default:
        "bg-coloring-accent text-white hover:bg-coloring-accent-dark [--bottom:var(--color-coloring-accent-dark)]",
      // Secondary uses the highlight token (CC: pink, CH: lighter green)
      secondary:
        "bg-coloring-highlight text-white hover:brightness-95 [--bottom:var(--color-coloring-accent-dark)]",
      // Destructive — pulls the error palette so it visually matches an error toast
      destructive:
        "bg-[var(--color-coloring-error-bg)] text-[var(--color-coloring-error-on)] hover:brightness-95 [--bottom:var(--color-coloring-error-bg-dark)]",
      // Success — matches success toast
      success:
        "bg-[var(--color-coloring-success-bg)] text-[var(--color-coloring-success-on)] hover:brightness-95 [--bottom:var(--color-coloring-success-bg-dark)]",
      // Outline — surface-coloured fill with brand-coloured border + text
      outline:
        "bg-coloring-surface text-coloring-accent border-2 border-coloring-accent hover:bg-coloring-surface-dark [--bottom:var(--color-coloring-accent-dark)]",
      // Ghost — no chunky shadow, gentle hover. Override the lift template
      // by setting --bottom to transparent.
      ghost:
        "bg-transparent text-coloring-text-primary hover:bg-coloring-surface-dark shadow-none active:shadow-none active:translate-y-0 [--bottom:transparent]",
      // Link — text-only, underline on hover. No shadow, no lift.
      link: "bg-transparent text-coloring-accent underline-offset-4 hover:underline shadow-none active:shadow-none active:translate-y-0 [--bottom:transparent] !rounded-none !px-0",
    },
    size: {
      default: "h-12 px-6 text-[1rem]",
      sm: "h-10 px-4 text-[0.875rem]",
      lg: "h-14 px-8 text-[1.125rem]",
      icon: "h-12 w-12 p-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
