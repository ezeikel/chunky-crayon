/**
 * Centre-reveal dispatcher — picks the right visual treatment for the
 * reveal beat based on `reel.kind`. Each Template* file calls this once
 * inside its reveal-beat AbsoluteFill instead of inlining the chromatic-
 * aberration recipe.
 *
 * Stat   → BigNumberWithAberration (the original treatment, three colour channels)
 * Myth   → VerdictStamp ("TRUE" / "FALSE" in a brand-coloured pill)
 * Tip    → TipCard (TODO Phase E1+)
 * Fact   → FactPhrase or BigNumberWithAberration if numeric (TODO Phase E1+)
 *
 * Falling back to BigNumberWithAberration on unknown kinds keeps Studio
 * scrubbing functional during the kind-by-kind rollout — even if a row
 * lands in the DB before its visual variant ships.
 */
import React from "react";

import type { ContentReelKind } from "../shared/types";
import { BigNumberWithAberration } from "./BigNumberWithAberration";
import { VerdictStamp } from "./VerdictStamp";

type CenterRevealProps = {
  kind: ContentReelKind;
  /** The reveal text — number for stats, verdict for myths, etc. */
  text: string;
  /** Spring-driven scale 0→1 from the parent template. */
  scale: number;
  /** Aberration offset in px for stat-kind. Ignored by other kinds. */
  aberrationOffsetPx: number;
  /** Font face to use across all reveals. */
  fontFamily: string;
  /** Stat-kind anchor (orange/pink/purple per template). */
  primaryColor: string;
  /** Stat-kind aberration ghost left. */
  aberrationLeftColor: string;
  /** Stat-kind aberration ghost right. */
  aberrationRightColor: string;
  /** Stat-kind number font size — varies per template (280 / 240 / 200). */
  fontSize: number;
};

export const CenterReveal: React.FC<CenterRevealProps> = ({
  kind,
  text,
  scale,
  aberrationOffsetPx,
  fontFamily,
  primaryColor,
  aberrationLeftColor,
  aberrationRightColor,
  fontSize,
}) => {
  if (kind === "myth") {
    return (
      <VerdictStamp
        text={text}
        scale={scale}
        primaryColor={primaryColor}
        fontFamily={fontFamily}
      />
    );
  }

  // Default — stat (and tip/fact until their variants ship).
  return (
    <BigNumberWithAberration
      text={text}
      scale={scale}
      aberrationOffsetPx={aberrationOffsetPx}
      fontFamily={fontFamily}
      fontSize={fontSize}
      primaryColor={primaryColor}
      aberrationLeftColor={aberrationLeftColor}
      aberrationRightColor={aberrationRightColor}
    />
  );
};
