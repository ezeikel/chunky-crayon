/**
 * The original stat-reel reveal — three colour channels offset to fake a
 * chromatic-aberration ghost trail around a huge number. Extracted from
 * the inline JSX in each Template* file so we can swap reveal treatments
 * by `kind`.
 *
 * The number scale + aberration spike are driven by the parent template
 * (so the same spring/timing feels consistent across reveals). Only the
 * static visual recipe lives here.
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
}) => {
  const channelStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    fontFamily,
    fontWeight: 900,
    fontSize,
    opacity: aberrationOpacity,
  };
  return (
    <div style={{ position: "relative", transform: `scale(${scale})` }}>
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
        }}
      >
        {text}
      </div>
    </div>
  );
};
