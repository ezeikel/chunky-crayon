/**
 * TikTok-style word-highlight caption renderer.
 *
 * Reads a per-word `tokens` array (CaptionToken[]) and highlights the
 * currently-active word against a base line. Designed for reels watched
 * sound-off (~80% of vertical-video views) — captions ARE the comprehension
 * channel, the visuals are the hook.
 *
 * Tokens are clip-relative ms (not composition-relative). Caller passes
 * `voiceStartFrame` so we can offset against `useCurrentFrame()`.
 *
 * Visual contract:
 *   - Base line: full caption text in muted brand colour, low contrast
 *   - Active word: brand-orange, scaled up slightly, drop shadow for punch
 *   - Words appear progressively (not pre-shown) so the eye follows the voice
 *
 * Font: assumes Tondo is already loaded in the parent composition (via
 * <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />). We only set
 * fontFamily / fontWeight here.
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS } from "../../v2/tokens/brand";
import type { CaptionToken } from "./types";

export type TikTokCaptionProps = {
  /** Per-word timings in clip-relative ms. */
  tokens: CaptionToken[];
  /** Composition frame at which the voice clip (and these tokens) start. */
  voiceStartFrame: number;
  /** Override the base font size. Defaults to 56px. */
  fontSize?: number;
  /** Active-word colour. Defaults to brand orange. */
  activeColor?: string;
  /** Inactive-word colour. Defaults to a muted warm grey. */
  inactiveColor?: string;
};

export const TikTokCaption: React.FC<TikTokCaptionProps> = ({
  tokens,
  voiceStartFrame,
  fontSize = 56,
  activeColor = COLORS.orangeDark,
  inactiveColor = COLORS.textSecondary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Where we are inside the voice clip, in ms.
  const clipMs = ((frame - voiceStartFrame) / fps) * 1000;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: 14,
        rowGap: 16,
        fontFamily: FONTS.heading,
        fontWeight: FONT_WEIGHTS.heading,
        fontSize,
        lineHeight: 1.2,
        textAlign: "center",
      }}
    >
      {tokens.map((token, i) => {
        // A word is "yet to appear" until its fromMs.
        if (clipMs < token.fromMs) {
          return null;
        }
        const isActive = clipMs >= token.fromMs && clipMs < token.toMs;
        return (
          <span
            key={i}
            style={{
              color: isActive ? activeColor : inactiveColor,
              transform: isActive ? "scale(1.08)" : "scale(1)",
              transformOrigin: "center bottom",
              textShadow: isActive ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
              transition: "color 80ms linear, transform 100ms ease-out",
              display: "inline-block",
            }}
          >
            {token.text}
          </span>
        );
      })}
    </div>
  );
};
