/**
 * Demo Reel V2 — presentational prompt textarea card.
 *
 * Visual mirror of the live `<TextInput>` (apps/chunky-crayon-web/
 * components/forms/CreateColoringPageForm/inputs/TextInput.tsx) plus the
 * surrounding card chrome from the homepage create form.
 *
 * Reads no context, no hooks, no translations — just renders the textarea
 * with a string of typed text, optionally followed by a blinking caret.
 * The reel's choreography slices the source prompt by `useCurrentFrame()`
 * to drive the typing animation.
 *
 * If the live TextInput's styling changes (border colour, padding,
 * placeholder, font), update this to match.
 */
import { COLORS, RADII, FONTS, FONT_WEIGHTS } from "../tokens/brand";

type PromptInputCardProps = {
  /** Text to render inside the textarea. Drive this off frame to type out. */
  typedText: string;
  /**
   * Whether to show the blinking caret at the end of typedText.
   * Disable when the typing is complete and the focus has moved on
   * (e.g. submit button press).
   */
  showCaret?: boolean;
  /**
   * 0..1 — caret blink phase. Reel choreography passes
   * `Math.floor(frame / 15) % 2` (or similar) to flicker the caret on/off.
   */
  caretVisible?: boolean;
  /** Placeholder shown when typedText is empty. Mirrors live `t('placeholder')`. */
  placeholder?: string;
};

export const PromptInputCard = ({
  typedText,
  showCaret = true,
  caretVisible = true,
  placeholder = "What would you like to color today?",
}: PromptInputCardProps) => {
  const isEmpty = typedText.length === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 32,
        borderRadius: RADII.card,
        background: COLORS.textInverted,
        border: `2px solid ${COLORS.borderLight}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          minHeight: 200,
          padding: 24,
          borderRadius: RADII.card,
          background: isEmpty ? COLORS.bgCream : COLORS.textInverted,
          border: `3px solid ${isEmpty ? COLORS.bgCreamDark : COLORS.orange}`,
          boxShadow: isEmpty
            ? "none"
            : `0 0 0 4px ${COLORS.orange}33, 0 2px 8px rgba(0,0,0,0.04)`,
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.body,
          fontSize: 36,
          lineHeight: 1.3,
          color: isEmpty ? COLORS.textMuted : COLORS.textPrimary,
          textAlign: "left",
          wordBreak: "break-word",
          transition: "none",
        }}
      >
        {isEmpty ? (
          <span style={{ color: COLORS.textMuted }}>{placeholder}</span>
        ) : (
          <>
            {typedText}
            {showCaret && (
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: "1em",
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  background: COLORS.orange,
                  opacity: caretVisible ? 1 : 0,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
