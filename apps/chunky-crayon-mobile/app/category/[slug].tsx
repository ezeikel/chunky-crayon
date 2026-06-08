import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { getCategoryBySlug } from "@one-colored-pixel/coloring-core/gallery";
import ColoringImages from "@/components/ColoringImages/ColoringImages";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import { COLORS } from "@/lib/design";

/**
 * Per-category browse screen. The header (name + icon + blurb) comes from the
 * shared category constant; the grid is the existing <ColoringImages /> filtered
 * to the category's tag set. Tapping any page → /coloring-image/[id] to color.
 */
const CategoryScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // "all" is the browse-everything surface (unfiltered full library) — the
  // Gallery tab's "Browse all pages" entry. Reuses this same screen so there's
  // one library grid renderer.
  if (slug === "all") {
    return (
      <>
        <Stack.Screen options={{ headerTitle: "All coloring pages" }} />
        <View style={styles.root}>
          <LinearGradient
            colors={["#FDFAF5", "#F5EEE5"]}
            style={styles.gradient}
          >
            <View style={styles.gridWrap}>
              <ColoringImages />
            </View>
          </LinearGradient>
        </View>
      </>
    );
  }

  const category = slug ? getCategoryBySlug(slug) : undefined;

  if (!category) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: "Category" }} />
        <View style={styles.emptyRoot}>
          <Text style={styles.emptyText}>
            We couldn&apos;t find that category.
          </Text>
        </View>
      </>
    );
  }

  const { icon, primary } = getCategoryPresentation(category.slug);

  return (
    <>
      <Stack.Screen options={{ headerTitle: category.name }} />
      <View style={styles.root}>
        <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
          <View style={styles.header}>
            <FontAwesomeIcon
              icon={icon}
              size={28}
              color={primary}
              secondaryColor={primary}
              secondaryOpacity={0.35}
            />
            <Text style={styles.title}>{category.name}</Text>
            <Text style={styles.subtitle}>{category.description}</Text>
          </View>
          <View style={styles.gridWrap}>
            <ColoringImages category={category.slug} />
          </View>
        </LinearGradient>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  gridWrap: { flex: 1 },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#FDFAF5",
  },
  emptyText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});

export default CategoryScreen;
