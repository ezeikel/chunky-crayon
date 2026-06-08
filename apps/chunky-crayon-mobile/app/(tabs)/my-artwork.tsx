import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import Spinner from "@/components/Spinner/Spinner";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHeart, faPalette } from "@fortawesome/pro-solid-svg-icons";
import {
  faPaintbrush,
  faHeart as faHeartDuotone,
} from "@fortawesome/pro-duotone-svg-icons";
import { useState } from "react";
import { useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import ParentalGate from "@/components/ParentalGate";
import useHeaderData from "@/hooks/useHeaderData";
import { useFeed } from "@/hooks/api";
import { useMergedArtworks } from "@/hooks/useMergedArtworks";
import { cleanTitle } from "@one-colored-pixel/coloring-core/copy";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";

const GRID_PADDING = 16;
const GRID_GAP = 12;
const COLUMNS = 2;

const MyArtworkScreen = () => {
  const t = useT("mobile.myArtwork");
  // useWindowDimensions so the 2-up grid re-flows on iPad rotation; the card
  // width is applied inline (over styles.artworkCard) since it's now dynamic.
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth =
    (screenWidth - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
  const headerData = useHeaderData();
  // Local-first + DB merge (Phase 4): a just-saved drawing shows instantly from
  // the on-device store; once the background sync pushes it, the DB row dedups
  // it back to one. Logged-out, the DB cache is empty so it's all local (ghost).
  const { artworks, isLoading } = useMergedArtworks();
  const { data: feed } = useFeed();
  const router = useRouter();
  // "For Grown-ups" door → parent gate → settings (present on every tab).
  const [isSettingsGateOpen, setIsSettingsGateOpen] = useState(false);
  // In-progress "workbench" — coloring pages the kid has started but not
  // saved. Web splits my-stuff into this workbench + the saved archive;
  // mobile mirrors that with an "In Progress" section above "Saved".
  const inProgress = feed?.inProgressWork ?? [];

  const handleArtworkPress = (coloringImageId: string) => {
    // light tap: opening an artwork card from the grid is a light selection
    tapLight();
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
      <Spinner size={40} />
      <Text style={styles.loadingText}>{t("loading")}</Text>
    </View>
  );

  // Workbench: pages started but not yet saved. Tap to keep coloring.
  const renderInProgress = () => {
    if (inProgress.length === 0) return null;
    return (
      <View style={styles.gridContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionBadge, styles.sectionBadgePink]}>
            <FontAwesomeIcon
              icon={faPaintbrush}
              size={18}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
            />
          </View>
          <Text style={styles.sectionTitle}>{t("keepColoring")}</Text>
        </View>
        <View style={styles.grid}>
          {inProgress.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.artworkCard,
                { width: itemWidth },
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
                  <SafeSvgUri
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
                  {item.coloringImage.displayTitle ??
                    cleanTitle(item.coloringImage.title)}
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
        <View style={[styles.sectionBadge, styles.sectionBadgeOrange]}>
          <FontAwesomeIcon
            icon={faHeartDuotone}
            size={18}
            color={COLORS.crayonOrange}
            secondaryColor={COLORS.secondaryOrange}
            secondaryOpacity={1}
          />
        </View>
        <Text style={styles.sectionTitle}>
          {t("savedCount", { count: artworks.length })}
        </Text>
      </View>
      <View style={styles.grid}>
        {artworks.map((artwork) => (
          <Pressable
            key={artwork.key}
            style={({ pressed }) => [
              styles.artworkCard,
              { width: itemWidth },
              pressed && styles.artworkCardPressed,
            ]}
            onPress={() => handleArtworkPress(artwork.coloringImageId)}
          >
            <Image
              source={{ uri: artwork.imageUri }}
              style={styles.artworkImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.artworkInfo}>
              <Text style={styles.artworkTitle} numberOfLines={1}>
                {cleanTitle(artwork.title)}
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
        <AppHeader
          credits={headerData.credits}
          profileName={headerData.profileName}
          avatarId={headerData.avatarId}
          onSettingsPress={() => setIsSettingsGateOpen(true)}
        />
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

      {/* Settings is parent-gated: door opens this gate, success routes to the
          settings stack. Same wiring as Home. */}
      <ParentalGate
        visible={isSettingsGateOpen}
        onClose={() => setIsSettingsGateOpen(false)}
        onSuccess={() => {
          setIsSettingsGateOpen(false);
          router.push("/settings");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 128,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 128,
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
    gap: 12,
    marginBottom: 16,
  },
  // Coloured icon medallion (matches the Stickers + Gallery section badges).
  sectionBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgePink: {
    backgroundColor: "rgba(228,100,68,0.10)",
  },
  sectionBadgeOrange: {
    backgroundColor: "rgba(228,100,68,0.12)",
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
    // width is applied inline (dynamic, from useWindowDimensions).
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
