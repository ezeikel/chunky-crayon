"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faFaceFrownOpen,
} from "@fortawesome/pro-duotone-svg-icons";
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
          "absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm rounded-lg z-10 px-6",
          className,
        )}
        data-testid="magic-colors-loading"
      >
        <div className="flex flex-col items-center gap-4 p-6 md:p-8 rounded-coloring-card bg-white border-2 border-coloring-surface-dark shadow-lg max-w-sm w-full">
          <div className="flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-coloring-magic-from to-coloring-magic-to">
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-white text-2xl"
            />
          </div>
          <h2 className="font-coloring-heading font-bold text-2xl text-coloring-text-primary text-center">
            {title}
          </h2>
          <p className="font-coloring-body text-base text-coloring-text-secondary text-center">
            {body}
          </p>
          <div className="w-full h-3 rounded-full bg-coloring-surface overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-coloring-magic-from to-coloring-magic-to animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // state === "error"
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm rounded-lg z-10 px-6",
        className,
      )}
      data-testid="magic-colors-error"
    >
      <div className="flex flex-col items-center gap-4 p-6 md:p-8 rounded-coloring-card bg-white border-2 border-coloring-surface-dark shadow-lg max-w-sm w-full">
        <div className="flex items-center justify-center size-16 rounded-full bg-coloring-magic-to/15">
          <FontAwesomeIcon
            icon={faFaceFrownOpen}
            className="text-coloring-magic-to text-2xl"
          />
        </div>
        <h2 className="font-coloring-heading font-bold text-2xl text-coloring-text-primary text-center">
          {copy.errorTitle}
        </h2>
        {errorMessage && (
          <p className="font-coloring-body text-base text-coloring-text-secondary text-center">
            {errorMessage}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-coloring-heading font-bold text-white bg-gradient-to-br from-coloring-magic-from to-coloring-magic-to rounded-full px-8 py-3 text-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {copy.tryAgain}
          </button>
        )}
      </div>
    </div>
  );
};

export default MagicColorOverlay;
