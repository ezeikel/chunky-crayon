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
  // Soft elevation by default. Brand variants opt INTO the chunky bottom-drop
  // lift via `[--bottom:...]` + the `--has-lift:1` token, which the shadow
  // template multiplies by 6px. Without it the lift collapses to 0 and we get
  // just the soft elevation — so call sites that override bg via inline
  // className never see a coloured lift bleeding under a different-coloured
  // button face.
  "[--bottom:transparent] [--lift:0px] [--lift-active:0px]",
  "shadow-[0_var(--lift)_0_0_var(--bottom),0_4px_14px_-2px_rgb(0_0_0/0.12),0_2px_4px_-1px_rgb(0_0_0/0.06)]",
  "active:shadow-[0_var(--lift-active)_0_0_var(--bottom),0_2px_8px_-2px_rgb(0_0_0/0.12)]",
].join(" ");

const buttonVariants = cva(baseClasses, {
  variants: {
    variant: {
      // Default brand accent (CC: chunky orange, CH: green) — opts into lift.
      default:
        "bg-coloring-accent text-white hover:bg-coloring-accent-dark [--bottom:var(--color-coloring-accent-dark)] [--lift:6px] [--lift-active:3px]",
      // Secondary uses the highlight token — opts into lift.
      secondary:
        "bg-coloring-highlight text-white hover:brightness-95 [--bottom:var(--color-coloring-accent-dark)] [--lift:6px] [--lift-active:3px]",
      // Destructive — pulls the error palette so it visually matches an error toast.
      destructive:
        "bg-[var(--color-coloring-error-bg)] text-[var(--color-coloring-error-on)] hover:brightness-95 [--bottom:var(--color-coloring-error-bg-dark)] [--lift:6px] [--lift-active:3px]",
      // Success — matches success toast.
      success:
        "bg-[var(--color-coloring-success-bg)] text-[var(--color-coloring-success-on)] hover:brightness-95 [--bottom:var(--color-coloring-success-bg-dark)] [--lift:6px] [--lift-active:3px]",
      // Outline — surface-coloured fill with brand-coloured border + text.
      outline:
        "bg-coloring-surface text-coloring-accent border-2 border-coloring-accent hover:bg-coloring-surface-dark [--bottom:var(--color-coloring-accent-dark)] [--lift:6px] [--lift-active:3px]",
      // Neutral — chunky lift in dark text-primary. Use for secondary CTAs
      // that shouldn't compete with the primary brand-orange button (e.g.
      // pricing's non-popular plans, "skip" actions).
      neutral:
        "bg-coloring-text-primary text-white hover:bg-coloring-text-primary/90 [--bottom:color-mix(in_oklab,var(--color-coloring-text-primary)_60%,black)] [--lift:6px] [--lift-active:3px]",
      // Muted outline — cream-bordered, neutral text. Used for input mode
      // toggles and other secondary controls that should feel like soft
      // surfaces, not branded calls-to-action.
      "outline-muted":
        "bg-coloring-surface text-coloring-text-primary border-2 border-coloring-surface-dark hover:bg-coloring-surface-dark",
      // Ghost — flat, no shadow at all.
      ghost:
        "bg-transparent text-coloring-text-primary hover:bg-coloring-surface-dark shadow-none active:shadow-none active:translate-y-0",
      // Link — text-only, underline on hover.
      link: "bg-transparent text-coloring-accent underline-offset-4 hover:underline shadow-none active:shadow-none active:translate-y-0 !rounded-none !px-0",
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
