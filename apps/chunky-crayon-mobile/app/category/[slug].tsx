import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { getCategoryBySlug } from "@one-colored-pixel/coloring-core/gallery";
import ColoringImages from "@/components/ColoringImages/ColoringImages";
import { getCategoryPresentation } from "@/lib/gallery/categoryPresentation";
import { useT } from "@/lib/i18n/useT";
import { COLORS } from "@/lib/design";

/**
 * Per-category browse screen. The header (name + icon + blurb) comes from the
 * shared category constant; the grid is the existing <ColoringImages /> filtered
 * to the category's tag set. Tapping any page → /coloring-image/[id] to color.
 */
const CategoryScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useT("mobile.category");
  // Category names + descriptions come from the shared catalog (slug-keyed);
  // we resolve their translations at the render site via a slug -> key lookup
  // (gallery.category.<slug> / gallery.categoryDescription.<slug>) rather than
  // editing the shared catalog source.
  const tCategoryName = useT("gallery.category");
  const tCategoryDescription = useT("gallery.categoryDescription");

  // "all" is the browse-everything surface (unfiltered full library) — the
  // Gallery tab's "Browse all pages" entry. Reuses this same screen so there's
  // one library grid renderer.
  if (slug === "all") {
    return (
      <>
        <Stack.Screen options={{ headerTitle: t("allTitle") }} />
        <View style={styles.root}>
          <LinearGradient
            colors={["#FDFAF5", "#F5EEE5"]}
            style={styles.gradient}
          >
            <View style={styles.gridWrap}>
              <ColoringImages fullScreen />
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
        <Stack.Screen options={{ headerTitle: t("fallbackTitle") }} />
        <View style={styles.emptyRoot}>
          <Text style={styles.emptyText}>{t("notFound")}</Text>
        </View>
      </>
    );
  }

  const { icon, primary } = getCategoryPresentation(category.slug);
  const categoryName = tCategoryName(category.slug);
  const categoryDescription = tCategoryDescription(category.slug);

  return (
    <>
      <Stack.Screen options={{ headerTitle: categoryName }} />
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
            <Text style={styles.title}>{categoryName}</Text>
            <Text style={styles.subtitle}>{categoryDescription}</Text>
          </View>
          <View style={styles.gridWrap}>
            <ColoringImages category={category.slug} fullScreen />
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
