import { ScrollView, Pressable, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { GALLERY_CATEGORIES } from "@one-colored-pixel/coloring-core/gallery";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import useCategoryCovers from "@/hooks/api/useCategoryCovers";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";
import { perfect } from "@/styles";

/**
 * Horizontal scroll of BIG SQUARE category tiles — Disney-Coloring-World style.
 * Each tile shows a REAL sample coloring page from that category (its cover
 * svgUrl), with the name on a soft gradient strip + a small FA-duotone brand
 * chip. Instantly obvious to a 3-8 y/o what "Animals" means (a cat, not a paw
 * glyph). Falls back to the FA-icon-on-brand-colour tile when a category has no
 * cover yet (or while covers load). Tap → /category/[slug].
 */
const TILE = 156;

const CategoryRow = () => {
  const { coverBySlug } = useCategoryCovers();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {GALLERY_CATEGORIES.map((category) => {
        const { icon, primary, bg } = getCategoryPresentation(category.slug);
        const cover = coverBySlug[category.slug];
        return (
          <Pressable
            key={category.slug}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
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
            {/* Name on a LIGHT crayon-orange strip (crayonOrangeLight #F2A18C)
                that reaches near-solid quickly so white text reads clearly over
                the B&W line art — only the top edge tails off into transparency
                so it blends into the art rather than a hard line. White chip
                carries the category icon. */}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 14,
    paddingVertical: 4,
  },
  tile: {
    width: TILE,
    height: TILE,
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
