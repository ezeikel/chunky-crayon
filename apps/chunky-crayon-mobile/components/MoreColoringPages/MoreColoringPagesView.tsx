import { View, Text, Pressable, StyleSheet } from "react-native";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { tapLight } from "@/utils/haptics";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Presentational "More Coloring Pages" grid — the tablet-portrait
 * equivalent of web's related-pages section
 * (apps/chunky-crayon-web/components/ColoringImageDetailView: a 6-up grid of
 * square line-art cards under the `relatedPages` heading). Fills the vertical
 * dead space below the coloring canvas on iPad portrait (the canvas is
 * width-bound at ~570px, leaving ~half the screen height empty).
 *
 * No data fetching / router calls — the smart wrapper (MoreColoringPages)
 * supplies items + the tap handler, so Storybook can render it with mocks.
 *
 * Cards are square SvgUri line-art (matching web's `object-contain` line art),
 * laid out as an even wrapping grid. `columns` defaults to 3 (the codebase's
 * tablet convention, see ColoringImages.getNumColumns ≥768 → 3).
 */

const GRID_GAP = 16;
const SIDE_PADDING = 20;

export type MoreColoringPagesItem = {
  id: string;
  svgUrl?: string | null;
  title?: string;
};

export type MoreColoringPagesViewProps = {
  /** The section heading (i18n `relatedPages` → "More Coloring Pages"). */
  heading: string;
  items: MoreColoringPagesItem[];
  /** Called when a card is tapped — wrapper navigates to the coloring image. */
  onItemPress: (item: MoreColoringPagesItem) => void;
  /** True while the wrapper's query is loading. */
  isLoading?: boolean;
  /** Cards per row. Default 3 (tablet). */
  columns?: number;
  /** Total content width to fit the grid into (screen width). */
  containerWidth: number;
};

const MoreColoringPagesView = ({
  heading,
  items,
  onItemPress,
  isLoading = false,
  columns = 3,
  containerWidth,
}: MoreColoringPagesViewProps) => {
  // Nothing to show (loading handled by the same compact shape, empty hidden).
  if (!isLoading && items.length === 0) {
    return null;
  }

  // Square side = (content width − side padding − inter-card gaps) / columns.
  const usableWidth = containerWidth - SIDE_PADDING * 2;
  const cardSize = Math.floor(
    (usableWidth - GRID_GAP * (columns - 1)) / columns,
  );

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>

      {isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: columns }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                { width: cardSize, height: cardSize },
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                { width: cardSize, height: cardSize },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                tapLight();
                onItemPress(item);
              }}
              accessibilityLabel={item.title || "Coloring page"}
            >
              <View style={styles.cardInner}>
                {item.svgUrl ? (
                  <SafeSvgUri
                    width="100%"
                    height="100%"
                    uri={item.svgUrl}
                    viewBox="0 0 1024 1024"
                  />
                ) : (
                  <Text style={styles.placeholderText}>🎨</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: "100%",
    marginTop: 24,
    paddingHorizontal: SIDE_PADDING,
    // Top divider mirrors web's `border-t` between canvas + related grid.
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCreamDark,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    // size set inline
  },
  cardInner: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  placeholderText: {
    fontSize: 32,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  skeletonCard: {
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    opacity: 0.5,
  },
});

export default MoreColoringPagesView;
