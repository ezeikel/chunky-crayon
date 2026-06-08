import { ScrollView, Pressable, View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { GALLERY_CATEGORIES } from "@one-colored-pixel/coloring-core/gallery";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";

/**
 * Horizontal scroll of the library's category pills — the Coupang/Prime-kids
 * "pills on top" pattern (Mobbin-validated). Compact: an FA-duotone icon on
 * the category's brand-tint background + the name. Tap → /category/[slug].
 * Used near the top of the Gallery tab and as a teaser on Home.
 */
const CategoryRow = () => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {GALLERY_CATEGORIES.map((category) => {
        const { icon, primary, bg } = getCategoryPresentation(category.slug);
        return (
          <Pressable
            key={category.slug}
            style={styles.item}
            onPress={() => {
              tapMedium();
              track(ANALYTICS_EVENTS.CATEGORY_OPENED, {
                category: category.slug,
              });
              router.push(`/category/${category.slug}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${category.name} coloring pages`}
          >
            <View style={[styles.iconCircle, { backgroundColor: bg }]}>
              <FontAwesomeIcon
                icon={icon}
                size={26}
                color={primary}
                secondaryColor={primary}
                secondaryOpacity={0.35}
              />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const TILE = 72;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 14,
    paddingVertical: 4,
  },
  item: {
    width: TILE,
    alignItems: "center",
  },
  iconCircle: {
    width: TILE,
    height: TILE,
    borderRadius: TILE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  label: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});

export default CategoryRow;
