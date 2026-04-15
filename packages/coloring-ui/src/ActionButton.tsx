"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import cn from "./cn";

/**
 * Primary action button used for "Start Over", "Print", "Share", "Download",
 * "Save to Gallery" — the row at the bottom of the coloring experience.
 *
 * Shape comes from brand tokens (radius, font, shadow, padding, motion).
 * App-level wrappers pass the colour + icon + label.
 *
 * Responsive: icon-only on mobile (matches `--coloring-touch-target`),
 * icon+text on desktop.
 */

export type ActionButtonTone =
  /** Primary brand accent — filled. Use for the main positive actions. */
  | "accent"
  /** Quieter outline in the highlight colour. Use for actions users
   * shouldn't tap by accident (e.g. Start Over wipes work). */
  | "secondary"
  /** Destructive / confirm state */
  | "destructive"
  /** Success state */
  | "success"
  /** Neutral outline */
  | "outline";

/**
 * Visual scale.
 * - `hero` — full chunky page CTA (icon + label, brand-token padding).
 * - `compact` — narrow icon + label pill for sidebars where width is tight.
 * - `tile` — kid-first icon-only square (64px). Label is hidden visually but
 *   exposed to assistive tech via aria-label + native title tooltip. Used
 *   for sidebar action rows where icons read better than text for young
 *   users.
 */
export type ActionButtonSize = "hero" | "compact" | "tile";

type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  icon: IconDefinition;
  label: string;
  /** Visible on mobile (icon-only), used for aria-label */
  ariaLabel?: string;
  tone?: ActionButtonTone;
  size?: ActionButtonSize;
  /** Override/extend Tailwind classes on the root element */
  className?: string;
  /** Optional trailing element rendered after the label (e.g. loading spinner) */
  trailing?: ReactNode;
};

const toneClasses: Record<ActionButtonTone, string> = {
  accent: "bg-coloring-accent text-white hover:bg-coloring-accent-dark",
  // Secondary = outline-only with the highlight colour. Quieter than accent;
  // good for actions you don't want users to tap accidentally (e.g. Start Over).
  secondary:
    "bg-white text-coloring-highlight border-2 border-coloring-highlight hover:bg-coloring-highlight/10",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-coloring-success text-white hover:bg-coloring-success/90",
  outline:
    "bg-white text-coloring-muted border-2 border-current hover:bg-coloring-surface-dark",
};

const base =
  "inline-flex items-center justify-center " +
  "font-coloring-heading [font-weight:var(--coloring-weight-heading)] " +
  "[letter-spacing:var(--tracking-coloring-button)] " +
  "rounded-coloring-button " +
  "transition-all duration-coloring-base ease-coloring " +
  "active:scale-95 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const sizeClasses: Record<ActionButtonSize, string> = {
  hero:
    // Mobile: square icon-only at touch-target size.
    // Desktop: full brand-chunky padding from tokens + Duolingo-style depth.
    "size-11 md:size-auto " +
    "[font-size:var(--text-coloring-button)] " +
    "[gap:var(--spacing-coloring-button-gap)] " +
    "md:[padding-inline:var(--spacing-coloring-button-px)] " +
    "md:[padding-block:var(--spacing-coloring-button-py)] " +
    "shadow-coloring-button hover:shadow-coloring-button-hover",
  compact:
    // Narrow sidebar fit — always icon+label, modest padding, no drop shadow.
    "w-full gap-2 px-4 py-2.5 text-sm",
  tile:
    // Kid-first icon-only square. 64px hits Sesame Workshop's 60-75px target
    // for ages 3-6. Label hidden visually; surfaced via aria-label + tooltip.
    "size-16",
};

const heroIconClass =
  "[width:var(--spacing-coloring-icon)] [height:var(--spacing-coloring-icon)]";
const compactIconClass = "size-4";
const tileIconClass = "size-12";

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      icon,
      label,
      ariaLabel,
      tone = "accent",
      size = "hero",
      className,
      trailing,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const iconClass =
      size === "tile"
        ? tileIconClass
        : size === "compact"
          ? compactIconClass
          : heroIconClass;
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel ?? label}
        title={size === "tile" ? (ariaLabel ?? label) : undefined}
        className={cn(base, sizeClasses[size], toneClasses[tone], className)}
        {...rest}
      >
        <FontAwesomeIcon
          icon={icon}
          size={size === "tile" ? "xl" : undefined}
          className={size === "tile" ? undefined : iconClass}
        />
        {size !== "tile" && (
          <span className={size === "compact" ? undefined : "hidden md:inline"}>
            {label}
          </span>
        )}
        {trailing}
      </button>
    );
  },
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
