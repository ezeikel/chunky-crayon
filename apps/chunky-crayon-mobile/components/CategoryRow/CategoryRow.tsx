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
 * Layout: a HORIZONTAL multi-row grid — tiles fill ROWS (2 on phones, 4 on
 * iPad) and the whole block scrolls SIDEWAYS together (App-Store-"top-charts"
 * style). Tiles + row count scale with the device so they stay proportional to
 * the Feed's Today/Continue cards (no tiny-156px-on-iPad mismatch).
 */
const GAP = 14;
const H_PADDING = 20;
const TABLET_BREAKPOINT = 768;

const CategoryRow = () => {
  const { width } = useWindowDimensions();
  const { coverBySlug } = useCategoryCovers();

  const isTablet = width >= TABLET_BREAKPOINT;
  const rows = isTablet ? 4 : 2;
  // Tile size: derive from how many tiles we want visible across the screen so
  // they scale with the device. ~2.4 across on phone (a peek of the next
  // column), ~5.4 on iPad. Keeps tiles proportional to the feed cards.
  const visibleAcross = isTablet ? 5.4 : 2.4;
  const tileSize = Math.round(
    (width - H_PADDING * 2 - GAP * (visibleAcross - 1)) / visibleAcross,
  );

  // Chunk the flat category list into COLUMNS of `rows` tiles each, so the grid
  // fills top-to-bottom then wraps to the next column (the direction a
  // horizontal multi-row grid reads).
  const columns: GalleryCategory[][] = [];
  for (let i = 0; i < GALLERY_CATEGORIES.length; i += rows) {
    columns.push(GALLERY_CATEGORIES.slice(i, i + rows));
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { gap: GAP }]}
    >
      {columns.map((column, colIndex) => (
        <View key={colIndex} style={[styles.column, { gap: GAP }]}>
          {column.map((category) => {
            const { icon, primary, bg } = getCategoryPresentation(
              category.slug,
            );
            const cover = coverBySlug[category.slug];
            return (
              <Pressable
                key={category.slug}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  tapMedium();
                  track(ANALYTICS_EVENTS.CATEGORY_OPENED, {
                    category: category.slug,
                  });
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
                  <View
                    style={[
                      styles.art,
                      styles.fallback,
                      { backgroundColor: bg },
                    ]}
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      size={52}
                      color={primary}
                      secondaryColor={primary}
                      secondaryOpacity={0.35}
                    />
                  </View>
                )}
                {/* Name on a LIGHT crayon-orange strip (crayonOrangeLight
                    #F2A18C) that reaches near-solid quickly so white text reads
                    clearly over the B&W line art — only the top edge tails off
                    into transparency so it blends into the art rather than a
                    hard line. White chip carries the category icon. */}
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
          })}
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
