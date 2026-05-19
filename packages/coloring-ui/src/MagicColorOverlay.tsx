"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faFaceFrownOpen,
} from "@fortawesome/pro-duotone-svg-icons";
import { Button } from "./Button";
import cn from "./cn";

/**
 * The magic-tool warm-up phase driving the overlay copy.
 * - `fillPoints` — first-time generation of fill points for an image
 *   without them (longer, one-time work).
 * - `colorMap` — building the 5×5 colour map from the canvas.
 */
export type MagicColorOverlayPhase = "fillPoints" | "colorMap";

/** Optional i18n overrides. English fallbacks used when omitted. */
export type MagicColorOverlayMessages = {
  loadingTitleFillPoints?: string;
  loadingTitleColorMap?: string;
  loadingBodyFillPoints?: string;
  loadingBodyColorMapFallback?: string;
  errorTitle?: string;
  tryAgain?: string;
};

type MagicColorOverlayProps = {
  /** `null` hides the overlay entirely. */
  state: "loading" | "error" | null;
  /** Controls loading-state copy. Ignored in error state. */
  phase?: MagicColorOverlayPhase;
  /** Optional custom loading body (e.g. progress message from the hook). */
  loadingMessage?: string;
  /** Required in error state. */
  errorMessage?: string;
  /** Callback for the Try Again button (error state). */
  onRetry?: () => void;
  /** Translation overrides; English defaults used otherwise. */
  messages?: MagicColorOverlayMessages;
  className?: string;
};

const DEFAULTS: Required<MagicColorOverlayMessages> = {
  loadingTitleFillPoints: "Mixing the colours",
  loadingTitleColorMap: "Getting the colours ready",
  loadingBodyFillPoints:
    "This only happens once — hang tight, your palette is on its way.",
  loadingBodyColorMapFallback: "Almost there — getting your palette ready.",
  errorTitle: "Something went wrong",
  tryAgain: "Try Again",
};

const magicIconStyle = {
  "--fa-primary-color": "var(--color-coloring-accent)",
  "--fa-secondary-color": "var(--color-coloring-highlight)",
  "--fa-secondary-opacity": "1",
} as React.CSSProperties;

const errorIconStyle = {
  "--fa-primary-color": "var(--color-coloring-error-bg)",
  "--fa-secondary-color": "var(--color-coloring-warning-bg)",
  "--fa-secondary-opacity": "1",
} as React.CSSProperties;

/**
 * Overlay shown over the canvas while the legacy magic-tool warm-up is
 * running (on-demand fill-points gen or 5×5 colour-map build for images
 * without a region store). Also renders an error state with a retry button.
 *
 * Radix-style: the parent decides whether the overlay should render at all
 * (i.e. gates it on the magic tool being active + region-store NOT ready);
 * this component only handles the visual presentation.
 */
const MagicColorOverlay = ({
  state,
  phase = "colorMap",
  loadingMessage,
  errorMessage,
  onRetry,
  messages = {},
  className,
}: MagicColorOverlayProps) => {
  if (state === null) return null;

  const copy = { ...DEFAULTS, ...messages };

  if (state === "loading") {
    const title =
      phase === "fillPoints"
        ? copy.loadingTitleFillPoints
        : copy.loadingTitleColorMap;
    const body =
      phase === "fillPoints"
        ? copy.loadingBodyFillPoints
        : loadingMessage || copy.loadingBodyColorMapFallback;

    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/85 px-6 backdrop-blur-sm",
          className,
        )}
        data-testid="magic-colors-loading"
      >
        <div className="flex w-full max-w-sm flex-col items-center rounded-coloring-card border-2 border-coloring-surface-dark bg-white p-7 text-center shadow-coloring-surface sm:p-8">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-coloring-accent/10">
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-3xl"
              style={magicIconStyle}
            />
          </div>
          <h2 className="font-coloring-heading text-2xl font-bold text-coloring-text-primary sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 font-coloring-body text-base leading-relaxed text-coloring-text-secondary">
            {body}
          </p>
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-coloring-surface">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-coloring-accent to-coloring-highlight" />
          </div>
        </div>
      </div>
    );
  }

  // state === "error"
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/85 px-6 backdrop-blur-sm",
        className,
      )}
      data-testid="magic-colors-error"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-coloring-card border-2 border-coloring-surface-dark bg-white p-7 text-center shadow-coloring-surface sm:p-8">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-coloring-error-bg/10">
          <FontAwesomeIcon
            icon={faFaceFrownOpen}
            className="text-3xl"
            style={errorIconStyle}
          />
        </div>
        <h2 className="font-coloring-heading text-2xl font-bold text-coloring-text-primary sm:text-3xl">
          {copy.errorTitle}
        </h2>
        {errorMessage && (
          <p className="mt-3 font-coloring-body text-base leading-relaxed text-coloring-text-secondary">
            {errorMessage}
          </p>
        )}
        {onRetry && (
          <Button type="button" onClick={onRetry} className="mt-6 min-w-36">
            {copy.tryAgain}
          </Button>
        )}
      </div>
    </div>
  );
};

export default MagicColorOverlay;
