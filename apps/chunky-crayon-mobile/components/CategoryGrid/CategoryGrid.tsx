import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { GALLERY_CATEGORIES } from "@one-colored-pixel/coloring-core/gallery";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS } from "@/lib/design";

/**
 * Rich 2-column grid of large colorful category cards — the Entale/Klarna
 * "Categories" pattern (Mobbin-validated), echoing Disney Coloring World's
 * franchise tiles. Each card = the category's brand-tint fill + a big FA
 * duotone icon + name. Tap → /category/[slug]. Used on the dedicated
 * "Browse by category" view.
 *
 * On iPad (wide) we go to 3 columns; phones use 2.
 */
const GRID_PADDING = 20;
const GRID_GAP = 14;

const CategoryGrid = () => {
  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 3 : 2;
  const cardWidth =
    (width - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns;

  return (
    <View style={styles.grid}>
      {GALLERY_CATEGORIES.map((category) => {
        const { icon, primary, bg } = getCategoryPresentation(category.slug);
        return (
          <Pressable
            key={category.slug}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth, backgroundColor: bg },
              pressed && styles.cardPressed,
            ]}
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
            <FontAwesomeIcon
              icon={icon}
              size={40}
              color={primary}
              secondaryColor={primary}
              secondaryOpacity={0.35}
            />
            <Text style={styles.name} numberOfLines={2}>
              {category.name}
            </Text>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  name: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});

export default CategoryGrid;
