import { View, Text, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faDog,
  faLeaf,
  faAppleWhole,
  faFaceSmile,
  faStar,
  faCloudSun,
} from "@fortawesome/pro-duotone-svg-icons";
import {
  useCanvasStore,
  STICKER_CATEGORIES,
  type StickerCategory,
} from "@/stores/canvasStore";
import { tapLight, selectionChanged } from "@/utils/haptics";
import { COLORS } from "@/lib/design";

/**
 * Sticker picker for the left rail — shown in place of the colour swatches
 * when the Sticker tool is active (a sticker is "what you place", same role
 * as a colour). A row of category icon-pills on top, then a wrapping grid of
 * the active category's emoji. Ported from the legacy CanvasToolbar picker
 * (which is no longer mounted in the live three-column rail).
 *
 * Mirrors web's sticker panel: pick a category, pick an emoji, tap the canvas
 * to place it. Emoji render via the system colour-emoji font.
 */

const CATEGORY_INFO: {
  category: StickerCategory;
  icon: IconDefinition;
}[] = [
  { category: "animals", icon: faDog },
  { category: "nature", icon: faLeaf },
  { category: "food", icon: faAppleWhole },
  { category: "faces", icon: faFaceSmile },
  { category: "objects", icon: faStar },
  { category: "weather", icon: faCloudSun },
];

const ACCENT = "#E46444";
const SURFACE_DARK = "#F0E9DC";

type StickerPickerGridProps = {
  /** Emoji cell side length (matches the colour swatch size). */
  cellSize?: number;
  /** Cells per row. */
  columns?: number;
};

const StickerPickerGrid = ({
  cellSize = 51,
  columns = 3,
}: StickerPickerGridProps) => {
  const { selectedSticker, stickerCategory, setSticker, setStickerCategory } =
    useCanvasStore();

  const emojis = STICKER_CATEGORIES[stickerCategory];

  return (
    <View style={styles.container}>
      {/* Category pills — icon-only, wrap to 2 rows of 3. */}
      <View style={styles.categoryRow}>
        {CATEGORY_INFO.map(({ category, icon }) => {
          const isActive = stickerCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => {
                tapLight();
                setStickerCategory(category);
                // Auto-select the first emoji in the new category.
                setSticker(STICKER_CATEGORIES[category][0]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${category} stickers`}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.categoryPill,
                isActive ? styles.categoryActive : styles.categoryIdle,
              ]}
            >
              <FontAwesomeIcon
                icon={icon}
                size={18}
                color={isActive ? "#FFFFFF" : COLORS.textPrimary}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Emoji grid for the active category. */}
      <View style={[styles.grid, { width: columns * (cellSize + GAP) }]}>
        {emojis.map((emoji, i) => {
          const isSelected = selectedSticker === emoji;
          return (
            <Pressable
              key={`${stickerCategory}-${i}`}
              onPress={() => {
                selectionChanged();
                setSticker(emoji);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sticker ${emoji}`}
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
              <Text style={{ fontSize: Math.round(cellSize * 0.55) }}>
                {emoji}
              </Text>
            </Pressable>
          );
        })}
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
  },
  cell: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  cellSelected: {
    backgroundColor: "#FFF5F2",
    borderColor: ACCENT,
  },
  cellIdle: {
    backgroundColor: "#FFFFFF",
    borderColor: SURFACE_DARK,
  },
});

export default StickerPickerGrid;
