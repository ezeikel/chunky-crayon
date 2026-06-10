import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPalette, faImages } from "@fortawesome/pro-duotone-svg-icons";
import SectionHeader from "@/components/SectionHeader/SectionHeader";
import SeeAllButton from "@/components/SeeAllButton/SeeAllButton";
import { useT } from "@/lib/i18n/useT";
import { tapLight } from "@/utils/haptics";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Presentational view for the recent-creations strip — no data
 * fetching, no router calls. Lives in its own file so Storybook can
 * render it with mock items without pulling in TanStack Query and
 * the expo-router stack. Same split web uses
 * (apps/chunky-crayon-web/components/MyRecentCreations/MyRecentCreationsView.tsx).
 *
 * Items carry `id` (used by the smart wrapper to build the
 * coloring-image route) + `previewUrl` (kid's saved progress preview
 * thumbnail) or `svgUrl` (line-art fallback) + `title`.
 */

// Phone card size; iPad bumps up so the recents strip isn't dwarfed next to the
// device-scaled category tiles above it (it stays a touch smaller than those —
// recents are a secondary strip, not the hero browse tiles).
const CARD_SIZE = 120;
const CARD_SIZE_TABLET = 180;
const CARD_GAP = 12;
const TABLET_BREAKPOINT = 768;

export type MyRecentCreationsItem = {
  id: string;
  previewUrl?: string | null;
  svgUrl?: string | null;
  title?: string;
};

export type MyRecentCreationsViewProps = {
  items: MyRecentCreationsItem[];
  /** Called when the kid taps a card. */
  onItemPress: (item: MyRecentCreationsItem) => void;
  /** Called when "See all my pictures" is tapped. */
  onSeeAllPress: () => void;
  /** True while the parent's query is loading. */
  isLoading?: boolean;
};

const MyRecentCreationsView = ({
  items,
  onItemPress,
  onSeeAllPress,
  isLoading = false,
}: MyRecentCreationsViewProps) => {
  const { width } = useWindowDimensions();
  const t = useT("mobile.myArtwork");
  const cardSize = width >= TABLET_BREAKPOINT ? CARD_SIZE_TABLET : CARD_SIZE;

  // Loading + empty get the same compact card shape so the home
  // layout doesn't shift between states.
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={[styles.skeletonCard, { height: cardSize + 60 }]} />
      </View>
    );
  }

  // Empty state — signed-in user with nothing generated yet.
  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconCircle}>
          <FontAwesomeIcon
            icon={faPalette}
            size={24}
            color={COLORS.crayonOrange}
            secondaryColor={COLORS.secondaryOrange}
            secondaryOpacity={1}
          />
        </View>
        <Text style={styles.emptyText}>{t("recentEmpty")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t("recentTitle")}
        icon={faImages}
        tint="gold"
        style={styles.header}
        right={
          <SeeAllButton
            onPress={onSeeAllPress}
            accessibilityLabel={t("seeAllRecent")}
          />
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              { width: cardSize, height: cardSize },
              pressed && styles.pressed,
            ]}
            onPress={() => {
              tapLight();
              onItemPress(item);
            }}
            accessibilityLabel={item.title || t("coloringPageA11y")}
          >
            <View style={styles.cardInner}>
              {item.previewUrl ? (
                <Image
                  source={{ uri: item.previewUrl }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : item.svgUrl ? (
                <SafeSvgUri width="100%" height="100%" uri={item.svgUrl} />
              ) : (
                <FontAwesomeIcon
                  icon={faPalette}
                  size={32}
                  color={COLORS.secondaryOrange}
                  secondaryColor={COLORS.bgCreamDark}
                  secondaryOpacity={1}
                />
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: "100%",
    marginTop: 24,
  },
  // Horizontal padding for the shared SectionHeader on this strip.
  header: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  // width/height set inline (device-aware: CARD_SIZE phone, CARD_SIZE_TABLET iPad).
  card: {},
  cardInner: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  skeletonCard: {
    height: CARD_SIZE + 60,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    opacity: 0.5,
  },
  emptyCard: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});

export default MyRecentCreationsView;
