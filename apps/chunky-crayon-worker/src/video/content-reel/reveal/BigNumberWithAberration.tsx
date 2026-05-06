/**
 * The original stat-reel reveal — three colour channels offset to fake a
 * chromatic-aberration ghost trail around a huge number. Extracted from
 * the inline JSX in each Template* file so we can swap reveal treatments
 * by `kind`.
 *
 * The number scale + aberration spike are driven by the parent template
 * (so the same spring/timing feels consistent across reveals). Only the
 * static visual recipe lives here.
 *
 * Sizing rules (added 2026-05-06 after "88% by age 5" wrapped + clipped
 * the frame edge on prod):
 *   - whiteSpace: nowrap on every text channel so multi-word centerBlocks
 *     don't break to two lines.
 *   - fontSize auto-shrinks from the parent's `fontSize` baseline based
 *     on the string length, so 4-char strings ("-15%") get the full
 *     baseline and longer strings ("88% by age 5") shrink to fit. Cap
 *     ratios match the cover's logic in shared/cover.tsx so cover and
 *     reel hit similar visual weights.
 *   - All three channels use the same shrunk fontSize so they stay
 *     pixel-aligned for the chromatic-aberration effect.
 */
import React from "react";

type Props = {
  /** The string to render — e.g. "7+ hrs", "-15%", "+18%". */
  text: string;
  /** Spring-driven scale 0→1; parent computes from beat timing. */
  scale: number;
  /** Frame-driven aberration offset in px. Spikes at snap, decays to 0. */
  aberrationOffsetPx: number;
  fontFamily: string;
  /** Baseline font size for short (≤3 char) strings. Shrinks for longer. */
  fontSize: number;
  /** Anchor colour — sits on top, defines the focal hue. */
  primaryColor: string;
  /** Pink/orange/etc. ghost trailing left. */
  aberrationLeftColor: string;
  /** Teal/purple/etc. ghost trailing right. */
  aberrationRightColor: string;
  /** Aberration channel opacity (0.85 in original templates). */
  aberrationOpacity?: number;
};

/**
 * Shrink the baseline fontSize for longer strings so the text fits the
 * 1080px wide frame on a single line. Numbers calibrated empirically:
 *   ≤3 chars  → 1.0x (e.g. "7+", "88%")
 *   ≤4 chars  → 0.78x (e.g. "-15%", "+18%")
 *   ≤6 chars  → 0.62x (e.g. "7+ hrs", "False")
 *   ≤9 chars  → 0.46x (e.g. "12 weeks")
 *   else       → 0.34x (e.g. "88% by age 5", longer fact-style reveals)
 */
const fitFontSize = (text: string, baseline: number): number => {
  const len = text.length;
  if (len <= 3) return baseline;
  if (len <= 4) return Math.round(baseline * 0.78);
  if (len <= 6) return Math.round(baseline * 0.62);
  if (len <= 9) return Math.round(baseline * 0.46);
  return Math.round(baseline * 0.34);
};

export const BigNumberWithAberration: React.FC<Props> = ({
  text,
  scale,
  aberrationOffsetPx,
  fontFamily,
  fontSize: baselineFontSize,
  primaryColor,
  aberrationLeftColor,
  aberrationRightColor,
  aberrationOpacity = 0.85,
}) => {
  const fontSize = fitFontSize(text, baselineFontSize);
  const channelStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    fontFamily,
    fontWeight: 900,
    fontSize,
    opacity: aberrationOpacity,
    whiteSpace: "nowrap",
    textAlign: "center",
  };
  return (
    <div
      style={{
        position: "relative",
        transform: `scale(${scale})`,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...channelStyle,
          color: aberrationLeftColor,
          transform: `translate(${-aberrationOffsetPx}px, 0)`,
        }}
      >
        {text}
      </div>
      <div
        style={{
          ...channelStyle,
          color: aberrationRightColor,
          transform: `translate(${aberrationOffsetPx}px, 0)`,
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "relative",
          fontFamily,
          fontWeight: 900,
          fontSize,
          color: primaryColor,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};
