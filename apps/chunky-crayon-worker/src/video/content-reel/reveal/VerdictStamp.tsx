/**
 * Myth reveal — a big TRUE / FALSE stamp instead of a chromatic number.
 *
 * Visual recipe: pill-shaped chunky stamp with a thick brand-coloured
 * outline + slight skew, scaled in via the parent template's spring.
 * Reads as "verdict landed", not "number revealed". Outline + skew evoke
 * a rubber-stamp aesthetic without literally faking grunge texture
 * (which gets noisy at 1080×1920 reel resolution).
 *
 * False = brand orange (matches Shock template anchor) — reads as
 *   "WRONG, but warmly". Avoids stop-sign red, which would read as
 *   alarmist on a kids brand.
 * True = brand green — reads as "yes, this is verified".
 */
import React from "react";

type Props = {
  /** "True" or "False" — case-insensitive comparison, displayed uppercase. */
  text: string;
  /** Spring-driven scale 0→1 from the parent template. */
  scale: number;
  /**
   * Per-template hex pair — Shock uses orangeDark, Warm uses pinkDark,
   * Quiet uses purpleDark. Stamp adopts the template's anchor so the
   * three myth variants feel cohesive with their non-myth siblings.
   */
  primaryColor: string;
  fontFamily: string;
};

export const VerdictStamp: React.FC<Props> = ({
  text,
  scale,
  primaryColor,
  fontFamily,
}) => {
  const upper = text.toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        transform: `scale(${scale}) rotate(-4deg)`,
        // Outlined pill that visually echoes a rubber-stamp impression.
        border: `12px solid ${primaryColor}`,
        borderRadius: 32,
        paddingTop: 32,
        paddingBottom: 32,
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily,
          fontWeight: 900,
          fontSize: 220,
          lineHeight: 1,
          letterSpacing: 4,
          color: primaryColor,
        }}
      >
        {upper}
      </div>
    </div>
  );
};
