import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { SvgUri } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHeart, faPalette } from "@fortawesome/pro-solid-svg-icons";
import { faPaintbrush } from "@fortawesome/pro-duotone-svg-icons";
import { useRouter } from "expo-router";
import { useSavedArtworks, useFeed } from "@/hooks/api";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

const { width: screenWidth } = Dimensions.get("window");
const GRID_PADDING = 16;
const GRID_GAP = 12;
const COLUMNS = 2;
const ITEM_WIDTH =
  (screenWidth - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

const MyArtworkScreen = () => {
  const t = useT("mobile.myArtwork");
  const { data, isLoading } = useSavedArtworks();
  const { data: feed } = useFeed();
  const router = useRouter();

  const artworks = data?.artworks ?? [];
  // In-progress "workbench" — coloring pages the kid has started but not
  // saved. Web splits my-stuff into this workbench + the saved archive;
  // mobile mirrors that with an "In Progress" section above "Saved".
  const inProgress = feed?.inProgressWork ?? [];

  const handleArtworkPress = (coloringImageId: string) => {
    router.push(`/coloring-image/${coloringImageId}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyState}>
        <View style={styles.iconContainer}>
          <FontAwesomeIcon icon={faHeart} size={48} color="#E46444" />
        </View>
        <Text style={styles.title}>{t("emptyTitle")}</Text>
        <Text style={styles.subtitle}>{t("emptySubtitle")}</Text>
        <View style={styles.tipContainer}>
          <FontAwesomeIcon icon={faPalette} size={16} color="#9CA3AF" />
          <Text style={styles.tipText}>{t("emptyTip")}</Text>
        </View>
      </View>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#E46444" />
      <Text style={styles.loadingText}>{t("loading")}</Text>
    </View>
  );

  // Workbench: pages started but not yet saved. Tap to keep coloring.
  const renderInProgress = () => {
    if (inProgress.length === 0) return null;
    return (
      <View style={styles.gridContainer}>
        <View style={styles.sectionHeaderRow}>
          <FontAwesomeIcon
            icon={faPaintbrush}
            size={18}
            color={COLORS.crayonOrange}
            secondaryColor={COLORS.crayonPeach}
            secondaryOpacity={1}
          />
          <Text style={styles.sectionTitle}>{t("keepColoring")}</Text>
        </View>
        <View style={styles.grid}>
          {inProgress.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.artworkCard,
                pressed && styles.artworkCardPressed,
              ]}
              onPress={() => handleArtworkPress(item.coloringImageId)}
            >
              {item.previewUrl ? (
                <Image
                  source={{ uri: item.previewUrl }}
                  style={styles.artworkImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : item.coloringImage.svgUrl ? (
                <View style={styles.artworkImage}>
                  <SvgUri
                    uri={item.coloringImage.svgUrl}
                    width="100%"
                    height="100%"
                  />
                </View>
              ) : (
                <View style={styles.artworkImage} />
              )}
              <View style={styles.artworkInfo}>
                <Text style={styles.artworkTitle} numberOfLines={1}>
                  {item.coloringImage.title}
                </Text>
                <Text style={styles.artworkDate}>{t("inProgress")}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderArtworkGrid = () => (
    <View style={styles.gridContainer}>
      <View style={styles.sectionHeaderRow}>
        <FontAwesomeIcon icon={faHeart} size={16} color={COLORS.crayonOrange} />
        <Text style={styles.sectionTitle}>
          {t("savedCount", { count: artworks.length })}
        </Text>
      </View>
      <View style={styles.grid}>
        {artworks.map((artwork) => (
          <Pressable
            key={artwork.id}
            style={({ pressed }) => [
              styles.artworkCard,
              pressed && styles.artworkCardPressed,
            ]}
            onPress={() => handleArtworkPress(artwork.coloringImageId)}
          >
            <Image
              source={{ uri: artwork.imageUrl }}
              style={styles.artworkImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.artworkInfo}>
              <Text style={styles.artworkTitle} numberOfLines={1}>
                {artwork.title}
              </Text>
              <Text style={styles.artworkDate}>
                {new Date(artwork.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={
            // Centered empty state only when there's nothing at all —
            // neither in-progress nor saved.
            !isLoading && artworks.length === 0 && inProgress.length === 0
              ? styles.emptyScrollContent
              : styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            renderLoading()
          ) : artworks.length === 0 && inProgress.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {renderInProgress()}
              {artworks.length > 0 && renderArtworkGrid()}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: "#E46444",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  tipText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  gridContainer: {
    padding: GRID_PADDING,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  artworkCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  artworkCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  artworkImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F3F4F6",
  },
  artworkInfo: {
    padding: 12,
  },
  artworkTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  artworkDate: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
  },
});

export default MyArtworkScreen;
