import {
  ScrollView,
  Pressable,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { GALLERY_CATEGORIES } from "@one-colored-pixel/coloring-core/gallery";
import type { GalleryCategory } from "@one-colored-pixel/coloring-core/gallery";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import useCategoryCovers from "@/hooks/api/useCategoryCovers";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";
import { perfect } from "@/styles";

/**
 * BIG SQUARE category tiles — Disney-Coloring-World style. Each tile shows a
 * REAL sample coloring page from that category (its cover svgUrl), with the
 * name on a soft gradient strip + a small FA-duotone brand chip. Instantly
 * obvious to a 3-8 y/o what "Animals" means (a cat, not a paw glyph). Falls back
 * to the FA-icon-on-brand-colour tile when a category has no cover yet (or while
 * covers load). Tap → /category/[slug].
 *
 * Layout is device-dependent:
 *   - PHONE: a horizontal multi-row scroll — tiles fill 2 rows and the block
 *     scrolls SIDEWAYS (15 tiles won't fit a narrow screen, so scroll is needed).
 *   - iPAD: a full-width WRAP grid — 4 across, wrapping down, NO horizontal
 *     scroll. All 15 fit, so a scroller would just leave dead space on the right.
 * Tiles scale with the device so they stay proportional to the feed cards.
 */
const GAP = 14;
const H_PADDING = 20;
const TABLET_BREAKPOINT = 768;
const TABLET_COLUMNS = 4;
const PHONE_ROWS = 2;

const Tile = ({
  category,
  cover,
  size,
}: {
  category: GalleryCategory;
  cover: string | null | undefined;
  size: number;
}) => {
  const { icon, primary, bg } = getCategoryPresentation(category.slug);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
      onPress={() => {
        tapMedium();
        track(ANALYTICS_EVENTS.CATEGORY_OPENED, { category: category.slug });
        router.push(`/category/${category.slug}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Color ${category.name}`}
    >
      {cover ? (
        <View style={styles.art}>
          <SafeSvgUri
            width="100%"
            height="100%"
            uri={cover}
            viewBox="0 0 1024 1024"
          />
        </View>
      ) : (
        <View style={[styles.art, styles.fallback, { backgroundColor: bg }]}>
          <FontAwesomeIcon
            icon={icon}
            size={52}
            color={primary}
            secondaryColor={primary}
            secondaryOpacity={0.35}
          />
        </View>
      )}
      {/* Name on a LIGHT crayon-orange strip (crayonOrangeLight #F2A18C) that
          reaches near-solid quickly so white text reads clearly over the B&W
          line art — only the top edge tails off into transparency so it blends
          into the art rather than a hard line. White chip carries the icon. */}
      <LinearGradient
        colors={["rgba(242,161,140,0)", "rgba(242,161,140,1)"]}
        locations={[0, 0.45]}
        style={styles.nameStrip}
      >
        <View style={styles.chip}>
          <FontAwesomeIcon
            icon={icon}
            size={20}
            color={primary}
            secondaryColor={primary}
            secondaryOpacity={0.35}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

const CategoryRow = () => {
  const { width } = useWindowDimensions();
  const { coverBySlug } = useCategoryCovers();

  // iPad: full-width wrap grid, no horizontal scroll. All tiles fit, so a
  // scroller would just leave dead space on the right (the left-aligned look).
  if (width >= TABLET_BREAKPOINT) {
    // floor (not round): rounding UP overflows the container by a pixel or two,
    // which makes flexWrap drop the last tile to the next row — leaving only 3
    // across with a dead gutter on the right. floor guarantees 4 always fit.
    const tileSize = Math.floor(
      (width - H_PADDING * 2 - GAP * (TABLET_COLUMNS - 1)) / TABLET_COLUMNS,
    );
    return (
      <View style={[styles.wrapGrid, { gap: GAP }]}>
        {GALLERY_CATEGORIES.map((category) => (
          <Tile
            key={category.slug}
            category={category}
            cover={coverBySlug[category.slug]}
            size={tileSize}
          />
        ))}
      </View>
    );
  }

  // Phone: horizontal multi-row scroll. ~2.4 tiles visible across (a peek of the
  // next column cues the sideways scroll); tiles fill 2 rows per column.
  const visibleAcross = 2.4;
  const tileSize = Math.round(
    (width - H_PADDING * 2 - GAP * (visibleAcross - 1)) / visibleAcross,
  );
  const columns: GalleryCategory[][] = [];
  for (let i = 0; i < GALLERY_CATEGORIES.length; i += PHONE_ROWS) {
    columns.push(GALLERY_CATEGORIES.slice(i, i + PHONE_ROWS));
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { gap: GAP }]}
    >
      {columns.map((column, colIndex) => (
        <View key={colIndex} style={[styles.column, { gap: GAP }]}>
          {column.map((category) => (
            <Tile
              key={category.slug}
              category={category}
              cover={coverBySlug[category.slug]}
              size={tileSize}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: H_PADDING,
    paddingVertical: 4,
  },
  // iPad: tiles wrap to fill the full content width (no horizontal scroll).
  wrapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: H_PADDING,
    paddingVertical: 4,
  },
  // Each column holds `rows` tiles stacked vertically; columns lay out in a row
  // inside the horizontal ScrollView. alignItems flex-start so a short final
  // column (fewer than `rows` tiles) top-aligns rather than stretching.
  column: {
    justifyContent: "flex-start",
  },
  tile: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    ...perfect.boxShadow,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  art: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  nameStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 10,
  },
  // White chip on the orange strip carries the per-category icon for a pop of
  // brand identity without clashing with the orange.
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: COLORS.white,
  },
});

export default CategoryRow;
