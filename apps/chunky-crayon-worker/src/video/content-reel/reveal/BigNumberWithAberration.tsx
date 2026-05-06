/**
 * Reveal-beat number with three-channel chromatic aberration.
 *
 * Sizing strategy: measure-based fit. The text renders once at the
 * caller's baseline fontSize, we measure its natural width via a ref
 * after layout, then scale the whole stack down by
 * `min(1, maxWidth / naturalWidth)` so anything wider than the frame
 * shrinks to fit. Anything narrower stays at baseline.
 *
 * Why measure rather than the old length-based tier table:
 *   - "88% by age 5" (13 chars) overflowed at the Warm template's
 *     fontSize=240. The tier table fixed that case but failed
 *     compositionally — adding "MOSTLY FALSE" or "12 IN 100" needed
 *     new buckets, and the buckets ignored that "%" is half a char
 *     wide while "M" is wide.
 *   - Measuring lets one primitive serve all reveal strings (numbers,
 *     %ages, multi-word stats, future verdicts) without per-string
 *     tuning. cover.tsx wants to adopt the same primitive.
 *
 * Centring: the parent box has fixed width (`maxWidth`) and uses flex
 * justifyContent=center. The scale transform's origin is `center
 * center`, so the chromatic-aberration ghosts and the anchor stay
 * pixel-aligned at any scale. The ghost translate offsets are
 * multiplied by the same fit-scale so the aberration spread tracks the
 * shrunk text instead of staying at its baseline absolute pixel value.
 */
import React, { useLayoutEffect, useRef, useState } from "react";

type Props = {
  /** The string to render — e.g. "7+ hrs", "-15%", "88% by age 5". */
  text: string;
  /** Spring-driven scale 0→1; parent computes from beat timing. */
  scale: number;
  /** Frame-driven aberration offset in px (at baseline width). */
  aberrationOffsetPx: number;
  fontFamily: string;
  /** Baseline font size — text is rendered at this size, then scaled. */
  fontSize: number;
  /** Anchor colour — sits on top, defines the focal hue. */
  primaryColor: string;
  /** Pink/orange/etc. ghost trailing left. */
  aberrationLeftColor: string;
  /** Teal/purple/etc. ghost trailing right. */
  aberrationRightColor: string;
  /** Aberration channel opacity (0.85 in original templates). */
  aberrationOpacity?: number;
  /**
   * Available horizontal space inside the 1080px frame. Defaults to
   * 980 (50px side padding × 2). Templates with tighter columns can
   * override.
   */
  maxWidth?: number;
};

export const BigNumberWithAberration: React.FC<Props> = ({
  text,
  scale,
  aberrationOffsetPx,
  fontFamily,
  fontSize,
  primaryColor,
  aberrationLeftColor,
  aberrationRightColor,
  aberrationOpacity = 0.85,
  maxWidth = 980,
}) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  // Measure natural width once after layout; if the unscaled text is
  // wider than maxWidth, scale down. Runs every render but the read
  // is cheap (one offsetWidth lookup) and Remotion re-renders each
  // frame anyway.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const natural = el.offsetWidth;
    if (natural === 0) return;
    const next = Math.min(1, maxWidth / natural);
    if (Math.abs(next - fitScale) > 0.001) setFitScale(next);
  }, [text, fontSize, maxWidth, fitScale]);

  // Aberration offsets must scale with the text — otherwise a ±18px
  // ghost on a 95px-tall string looks like a chunky duplicate, not a
  // chromatic shimmer.
  const scaledAberration = aberrationOffsetPx * fitScale;

  const baseTextStyle: React.CSSProperties = {
    fontFamily,
    fontWeight: 900,
    fontSize,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };

  return (
    <div
      style={{
        width: maxWidth,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Reserves the layout slot at baseline height so the surrounding
        // composition doesn't reflow when fitScale changes between
        // frames.
        height: fontSize,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Hidden measurement element — same font + size as the visible
            text, used purely to read offsetWidth. position: absolute
            keeps it out of the layout flow. */}
        <div
          ref={measureRef}
          aria-hidden
          style={{
            ...baseTextStyle,
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {text}
        </div>

        {/* Aberration left ghost. */}
        <div
          style={{
            ...baseTextStyle,
            position: "absolute",
            top: 0,
            left: 0,
            color: aberrationLeftColor,
            opacity: aberrationOpacity,
            transform: `translate(${-scaledAberration}px, 0)`,
          }}
        >
          {text}
        </div>

        {/* Aberration right ghost. */}
        <div
          style={{
            ...baseTextStyle,
            position: "absolute",
            top: 0,
            left: 0,
            color: aberrationRightColor,
            opacity: aberrationOpacity,
            transform: `translate(${scaledAberration}px, 0)`,
          }}
        >
          {text}
        </div>

        {/* Anchor — defines layout box. The two ghosts above are
            absolute-positioned and read their dimensions from this
            element's flow. */}
        <div
          style={{
            ...baseTextStyle,
            position: "relative",
            color: primaryColor,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};
