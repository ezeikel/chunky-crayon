import { View, ScrollView, StyleSheet } from "react-native";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS } from "@/lib/design";
import PaletteVariantPills from "@/components/coloring/PaletteVariantPills";
import ColorSwatchGrid from "@/components/coloring/ColorSwatchGrid";
import StickerPickerGrid from "@/components/coloring/StickerPickerGrid";
import { selectionChanged } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import {
  COLORING_PALETTE_VARIANTS,
  type PaletteVariant,
} from "@/lib/coloring/palette";
import { getLandscapeRailFit } from "@/constants/Sizes";

/** Resolve a swatch's friendly name from its hex within the active variant. */
const swatchName = (variant: PaletteVariant, hex: string): string | undefined =>
  COLORING_PALETTE_VARIANTS[variant]?.find(
    (s) => s.hex.toLowerCase() === hex.toLowerCase(),
  )?.name;

type ColorPaletteSidebarProps = {
  /** Full width of the left column (rail + canvas gap + notch inset), from the layout. */
  width: number;
  /**
   * Height the rail must fit into (FIXED/landscape tier). When set, the swatch
   * size + pill height are derived (via the shared getLandscapeRailFit) to fit
   * all pills + 18 swatches in this height — clamped to today's sizes as a CEIL,
   * so a tall window (iPad) is a no-op. undefined → full content-height.
   */
  availableHeight?: number;
  /**
   * Safe-area inset on this column's screen edge (the notch / Dynamic Island in
   * landscape). The card pads away from it so it sits flush to the inner usable
   * edge while clearing the notch. Default 0 (iPad / no notch on this side).
   */
  edgeInset?: number;
};

/**
 * Left palette rail for the three-column coloring layout — a rounded
 * floating card (web's DesktopColorPalette) TOP-aligned beside the canvas:
 * mood-variant pills (2-up) on top, then a 3-column grid of round swatches
 * for the active variant. The card grows to fit all 18 swatches (no scroll,
 * no clipping). Dims when a magic tool is active (web's opacity +
 * pointer-events-none).
 *
 * The column `width` from the layout already includes the canvas gap; the
 * rail sits flush-left and the gap falls on its right via the outer padding.
 * Its top lines up with the progress-bar row (CanvasTopBar), matching web,
 * where the bar spans between the rails and shares their top edge.
 */
const ColorPaletteSidebar = ({
  width,
  availableHeight,
  edgeInset = 0,
}: ColorPaletteSidebarProps) => {
  // Height-adaptive fit comes from the SHARED helper so the rail card width and
  // the column-split width (getLandscapeSidebarWidths) agree exactly. On a tall
  // window (availableHeight undefined/large) it resolves to the iPad CEIL sizes.
  const isShort = availableHeight !== undefined && availableHeight < 560;
  const { swatchSize, pillHeight, leftCardWidth } =
    getLandscapeRailFit(availableHeight);
  // Hug the card to its content width only on a short window; on a tall window
  // let it size to content as before (iPad unchanged).
  const cardWidth = isShort ? leftCardWidth : undefined;
  // Narrow per-slice selectors instead of a whole-store subscription. The old
  // `useCanvasStore()` (no selector) re-rendered this rail on EVERY store change
  // — including every stroke's addAction (history change) — which the profiler
  // showed as a ~110ms whole-screen hot commit per stroke (the flash/jank). This
  // rail only renders on these tool/color/magic/variant primitives; a stroke
  // touches none of them, so it no longer re-renders on draw.
  const selectedColor = useCanvasStore((s) => s.selectedColor);
  const selectedTool = useCanvasStore((s) => s.selectedTool);
  const magicMode = useCanvasStore((s) => s.magicMode);
  const paletteVariant = useCanvasStore((s) => s.paletteVariant);
  // Stable action fns — identity never changes; read once, no subscription.
  const { setColor, setPaletteVariant } = useCanvasStore.getState();

  const isMagicToolActive =
    selectedTool === "magic" &&
    (magicMode === "suggest" || magicMode === "auto");

  // With the Sticker tool active the left rail picks the STICKER (what you
  // place), not a colour — swap the swatch grid for the emoji picker, matching
  // web. Without this the kid was stuck on the default sticker forever.
  const isStickerToolActive = selectedTool === "sticker";

  const handleColorSelect = (color: string) => {
    if (isMagicToolActive) return;
    track(ANALYTICS_EVENTS.PAGE_COLOR_SELECTED, {
      color,
      colorName: swatchName(paletteVariant, color),
    });
    selectionChanged();
    setColor(color);
  };

  const handleVariantSelect = (variant: PaletteVariant) => {
    track(ANALYTICS_EVENTS.PALETTE_VARIANT_CHANGED, {
      fromVariant: useCanvasStore.getState().paletteVariant,
      toVariant: variant,
    });
    setPaletteVariant(variant);
  };

  return (
    // paddingLeft clears the notch (edgeInset) while keeping the card flush to
    // the inner usable edge. The COLUMN width already reserves edgeInset.
    <View
      style={[styles.outer, { width, paddingLeft: Math.max(8, edgeInset) }]}
    >
      <View
        style={[
          styles.rail,
          // Hug content width on a short window (cardWidth) so no empty space
          // inside; cap to availableHeight so it never exceeds the rail height.
          availableHeight ? { maxHeight: availableHeight } : null,
          cardWidth ? { width: cardWidth } : null,
        ]}
      >
        {isStickerToolActive ? (
          <StickerPickerGrid cellSize={swatchSize} columns={3} />
        ) : (
          <>
            {/* Mood-variant pills (2-up) — fixed at the top of the card. */}
            <PaletteVariantPills
              selected={paletteVariant}
              onSelect={handleVariantSelect}
              columns={2}
              pillHeight={pillHeight}
            />

            {/* Swatch grid for the active variant. Resize-to-fit: swatchSize is
                computed so all 6 rows fit the rail height. On the SHORTEST phones
                the swatch FLOOR (30) is hit and 6 rows still overflow — a
                flexShrink ScrollView is the last-resort net so the bottom rows
                stay reachable instead of clipping past the card. On iPad / taller
                phones the grid fits and never scrolls. Dims for magic tools. */}
            <ScrollView
              style={styles.gridScrollView}
              contentContainerStyle={[
                styles.gridScroll,
                { opacity: isMagicToolActive ? 0.4 : 1 },
              ]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isMagicToolActive}
              pointerEvents={isMagicToolActive ? "none" : "auto"}
            >
              <ColorSwatchGrid
                variant={paletteVariant}
                selectedColor={isMagicToolActive ? "" : selectedColor}
                onSelect={handleColorSelect}
                columns={3}
                swatchSize={swatchSize}
              />
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer column: fixed width (from prop), never squeezed by the flex row.
  // The row top-aligns all columns, and this rail's top lines up with the
  // PROGRESS-BAR row (CanvasTopBar) — exactly as web, where the bar spans
  // between the two rails and their tops share the bar's top edge. So the
  // rail uses the same top padding as the canvas column (12), NOT a bar-
  // height offset. Right padding = canvas gap.
  outer: {
    flexShrink: 0,
    // Stretch to the row height so the rail card's maxHeight (set inline from
    // availableHeight) has a bound on a short window. On a tall window the card
    // hugs content (shorter than the row) → no-op, iPad unchanged. paddingLeft
    // is set inline = max(8, edgeInset) — flush to the inner edge, clearing the
    // notch. paddingRight = the canvas gap.
    alignSelf: "stretch",
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 16,
  },
  // The floating rail card. Width is set inline to exactly fit the swatch grid
  // (3 columns) + padding, so it doesn't stretch to the full column and leave
  // empty space inside when the swatches shrink on a short window. Content-height
  // on a tall window. Web radius 32 + uniform 16 padding + 2px cream border.
  rail: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  // flexShrink so the grid only takes the height left after the fixed pills,
  // and scrolls inside it when the floor-30 swatches overflow on a tiny phone.
  // No flexGrow → on a tall window it hugs content (no stretched empty space).
  gridScrollView: {
    flexShrink: 1,
    flexGrow: 0,
  },
  gridScroll: {
    paddingTop: 2,
    alignItems: "center",
  },
});

export default ColorPaletteSidebar;
