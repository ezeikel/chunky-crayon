import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faStar,
  faHeart,
  faShapes,
  faLeaf,
  faDog,
  faPartyHorn,
  faHandPointer,
  faCircleCheck,
} from "@fortawesome/pro-duotone-svg-icons";
import { useCanvasStore, type StickerCategory } from "@/stores/canvasStore";
import {
  getCanvasStickersByCategory,
  CANVAS_STICKER_IMAGES,
} from "@/lib/canvasStickers";
import { tapLight, selectionChanged } from "@/utils/haptics";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Kid-friendly sticker picker (ages 3-8). Shown when the Sticker tool is
 * active — in the iPad left rail (in place of colour swatches) AND in the
 * phone bottom sheet (in place of the palette/swatches). A sticker is "what
 * you place", same role as a colour.
 *
 * Designed for little hands + pre-readers:
 *   - A friendly heading ("Pick a sticker!") so the mode is obvious.
 *   - Big category pills with a clear icon + label.
 *   - A wrapping grid of the category's PNG stickers; the chosen one gets a
 *     thick orange ring + a check badge so "which one is picked" is obvious.
 *   - A two-step hint ("Now tap your picture!") — the #1 thing kids miss is
 *     that picking a sticker doesn't place it; you tap the canvas.
 *
 * `cellSize`/`columns` let the same component fit the narrow iPad rail (3-up,
 * 51px) and the wider phone sheet (bigger cells, more columns).
 */

const CATEGORY_INFO: {
  category: StickerCategory;
  label: string;
  icon: IconDefinition;
}[] = [
  { category: "stars", label: "Stars", icon: faStar },
  { category: "hearts", label: "Hearts", icon: faHeart },
  { category: "shapes", label: "Shapes", icon: faShapes },
  { category: "nature", label: "Nature", icon: faLeaf },
  { category: "animals", label: "Animals", icon: faDog },
  { category: "fun", label: "Fun", icon: faPartyHorn },
];

const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";

type StickerPickerGridProps = {
  /** Sticker cell side length. */
  cellSize?: number;
  /** Cells per row. */
  columns?: number;
  /**
   * Phone bottom sheet has more width than the iPad rail — show the category
   * pill LABELS and the heading/hint at full size. The narrow rail hides
   * labels (icon-only pills) to fit.
   */
  showLabels?: boolean;
};

const StickerPickerGrid = ({
  cellSize = 51,
  columns = 3,
  showLabels = false,
}: StickerPickerGridProps) => {
  // Narrow selectors (was whole-store useCanvasStore() → re-rendered on every
  // stroke). No history dep here.
  const selectedSticker = useCanvasStore((s) => s.selectedSticker);
  const stickerCategory = useCanvasStore((s) => s.stickerCategory);
  const { setSticker, setStickerCategory } = useCanvasStore.getState();

  const stickers = getCanvasStickersByCategory(stickerCategory);

  return (
    <View style={styles.container}>
      {/* Friendly heading — makes "you're picking a sticker" obvious. */}
      <Text style={styles.heading}>Pick a sticker!</Text>

      {/* Category pills — icon (+ label when there's room), wrap to fit. */}
      <View style={styles.categoryRow}>
        {CATEGORY_INFO.map(({ category, label, icon }) => {
          const isActive = stickerCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => {
                tapLight();
                setStickerCategory(category);
                // Auto-select the first sticker in the new category so there's
                // always something armed to place.
                const first = getCanvasStickersByCategory(category)[0];
                if (first) setSticker(first.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} stickers`}
              accessibilityState={{ selected: isActive }}
              style={[
                showLabels ? styles.categoryPillWide : styles.categoryPill,
                isActive ? styles.categoryActive : styles.categoryIdle,
              ]}
            >
              <FontAwesomeIcon
                icon={icon}
                size={showLabels ? 16 : 18}
                color={isActive ? "#FFFFFF" : COLORS.textPrimary}
              />
              {showLabels && (
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isActive ? "#FFFFFF" : COLORS.textPrimary },
                  ]}
                >
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* PNG sticker grid for the active category. The chosen sticker gets a
          thick orange ring + a check badge so kids see what's armed. */}
      <View style={[styles.grid, { width: columns * (cellSize + GAP) }]}>
        {stickers.map((sticker) => {
          const isSelected = selectedSticker === sticker.id;
          return (
            <Pressable
              key={sticker.id}
              onPress={() => {
                selectionChanged();
                setSticker(sticker.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sticker ${sticker.name}`}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  marginRight: GAP,
                  marginBottom: GAP,
                },
                isSelected ? styles.cellSelected : styles.cellIdle,
              ]}
            >
              <Image
                source={CANVAS_STICKER_IMAGES[sticker.id]}
                style={styles.cellImage}
                contentFit="contain"
                transition={120}
              />
              {isSelected && (
                <View style={styles.checkBadge}>
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    size={Math.round(cellSize * 0.34)}
                    color={ACCENT}
                    secondaryColor="#FFFFFF"
                    secondaryOpacity={1}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Two-step hint — the thing kids miss: picking ≠ placing. */}
      <View style={styles.hintRow}>
        <FontAwesomeIcon icon={faHandPointer} size={14} color={ACCENT} />
        <Text style={styles.hintText}>Now tap your picture!</Text>
      </View>
    </View>
  );
};

const GAP = 6;

const styles = StyleSheet.create({
  container: {
    gap: 10,
    alignItems: "center",
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  categoryPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  // Wider pill with an inline label, for the roomier phone sheet.
  categoryPillWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  categoryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  categoryActive: {
    backgroundColor: ACCENT,
    borderColor: "transparent",
  },
  categoryIdle: {
    backgroundColor: "#FFFFFF",
    borderColor: SURFACE_DARK,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  cell: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    position: "relative",
  },
  cellSelected: {
    backgroundColor: "#FFF5F2",
    borderColor: ACCENT,
    borderWidth: 3,
  },
  cellIdle: {
    backgroundColor: "#FFFFFF",
    borderColor: SURFACE_DARK,
  },
  cellImage: {
    width: "78%",
    height: "78%",
  },
  checkBadge: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hintText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default StickerPickerGrid;
