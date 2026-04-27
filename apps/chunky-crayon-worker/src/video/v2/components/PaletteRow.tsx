/**
 * Demo Reel V2 — presentational palette row.
 *
 * Visual mirror of the live `<ColorPalette>` (packages/coloring-ui/src/
 * ColorPalette.tsx). Reads no context, owns no state, has no event
 * handlers — it just renders the same swatch row at a given "selected"
 * index so the reel can highlight whichever colour the brush is currently
 * "using" via Remotion frame interpolation.
 *
 * Why not lift the live component?
 *   `<ColorPalette>` is wired into `useColoringContext`, plays sounds via
 *   `useSound`, fires haptics, persists to localStorage, and tracks
 *   analytics events. None of that runs cleanly in headless Chromium —
 *   and none of it matters in a video. A presentational mirror that
 *   imports the same `ALL_COLORING_COLORS` array gives pixel-identical
 *   swatches with zero of the side-effects.
 *
 * If the live palette's swatch styling changes, update this component to
 * match. Both pull colours from the same source array.
 */
import { ALL_COLORING_COLORS } from "@one-colored-pixel/coloring-ui";
import { COLORS, RADII, SHADOWS } from "../tokens/brand";

type PaletteRowProps = {
  /**
   * Index into ALL_COLORING_COLORS for the swatch the reel should show as
   * "selected" (ring + scale-up). null hides the selection ring entirely
   * — useful when the reel is between colour switches.
   */
  selectedIndex: number | null;
  /**
   * 0..1 — the "freshly-selected" pop animation. The reel's choreography
   * drives this off `useCurrentFrame()` via spring/interpolate, so the
   * swatch grows briefly when a new colour is picked, then settles.
   */
  selectionPop?: number;
  /** How many swatches to show. Live palette shows ALL_COLORING_COLORS.length. */
  limit?: number;
};

export const PaletteRow = ({
  selectedIndex,
  selectionPop = 0,
  limit,
}: PaletteRowProps) => {
  const colors = limit
    ? ALL_COLORING_COLORS.slice(0, limit)
    : ALL_COLORING_COLORS;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        padding: 24,
        borderRadius: RADII.card,
        background: COLORS.textInverted,
        border: `2px solid ${COLORS.borderLight}`,
        boxShadow: SHADOWS.surface,
        justifyContent: "center",
      }}
    >
      {colors.map((color, i) => {
        const isSelected = i === selectedIndex;
        const isWhite = color.hex.toUpperCase() === "#FFFFFF";
        // Selected swatch grows by 20% at peak pop, fades back to 1.0.
        const scale = isSelected ? 1 + 0.2 * selectionPop : 1;

        return (
          <div
            key={color.hex}
            style={{
              width: 56,
              height: 56,
              borderRadius: RADII.pill,
              background: color.hex,
              border: isSelected
                ? `3px solid ${COLORS.textInverted}`
                : `2px solid ${isWhite ? COLORS.borderMedium : COLORS.borderLight}`,
              boxShadow: isSelected
                ? `0 0 0 4px ${COLORS.orange}, 0 4px 8px rgba(0,0,0,0.12)`
                : "0 2px 4px rgba(0,0,0,0.06)",
              transform: `scale(${scale})`,
              transition: "none",
            }}
            aria-label={color.name}
          />
        );
      })}
    </div>
  );
};
