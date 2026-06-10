import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { GALLERY_CATEGORIES } from "@one-colored-pixel/coloring-core/gallery";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import { useT } from "@/lib/i18n/useT";
import useCategoryCovers from "@/hooks/api/useCategoryCovers";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";
import { perfect } from "@/styles";

/**
 * Full "Browse by category" grid — big sample-image tiles (same Disney-style
 * cards as CategoryRow) in a 2-col (3 on iPad) grid. Each tile = the category's
 * real cover page + name overlay + FA brand chip; FA-on-colour fallback when no
 * cover. Tap → /category/[slug].
 */
const GRID_PADDING = 20;
const GRID_GAP = 14;

const CategoryGrid = () => {
  const { width } = useWindowDimensions();
  const { coverBySlug } = useCategoryCovers();
  // Category names come from the shared catalog (slug-keyed); translate at the
  // render site via slug -> key lookup (gallery.category.<slug>) so we never
  // edit the shared catalog source.
  const tCategoryName = useT("gallery.category");
  const tGallery = useT("mobile.gallery");
  const numColumns = width >= 768 ? 3 : 2;
  // floor so N columns always fit — rounding up overflows and wraps the last
  // tile, leaving a dead gutter on the right.
  const cardWidth = Math.floor(
    (width - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns,
  );

  return (
    <View style={styles.grid}>
      {GALLERY_CATEGORIES.map((category) => {
        const { icon, primary, bg } = getCategoryPresentation(category.slug);
        const cover = coverBySlug[category.slug];
        const categoryName = tCategoryName(category.slug);
        return (
          <Pressable
            key={category.slug}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth },
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
            accessibilityLabel={tGallery("colorCategoryA11y", {
              name: categoryName,
            })}
          >
            {cover ? (
              <View style={styles.art}>
                <SafeSvgUri width="100%" height="100%" uri={cover} />
              </View>
            ) : (
              <View
                style={[styles.art, styles.fallback, { backgroundColor: bg }]}
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
            {/* Light crayon-orange strip (#F2A18C, see CategoryRow) — near-solid
                quickly for readable white text, only the top edge tails off so
                it blends into the line art rather than a hard line. */}
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
                {categoryName}
              </Text>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  card: {
    aspectRatio: 1,
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

export default CategoryGrid;
