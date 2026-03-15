import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHeart, faPalette } from "@fortawesome/pro-solid-svg-icons";
import { useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import useHeaderData from "@/hooks/useHeaderData";
import { useSavedArtworks } from "@/hooks/api";

const { width: screenWidth } = Dimensions.get("window");
const GRID_PADDING = 16;
const GRID_GAP = 12;
const COLUMNS = 2;
const ITEM_WIDTH =
  (screenWidth - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

const MyArtworkScreen = () => {
  const headerData = useHeaderData();
  const { data, isLoading, error } = useSavedArtworks();
  const router = useRouter();

  const artworks = data?.artworks ?? [];

  const handleArtworkPress = (coloringImageId: string) => {
    router.push(`/coloring-image/${coloringImageId}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyState}>
        <View style={styles.iconContainer}>
          <FontAwesomeIcon icon={faHeart} size={48} color="#E46444" />
        </View>
        <Text style={styles.title}>Your Saved Artwork</Text>
        <Text style={styles.subtitle}>
          Your favorite creations will appear here. Start coloring and save your
          masterpieces!
        </Text>
        <View style={styles.tipContainer}>
          <FontAwesomeIcon icon={faPalette} size={16} color="#9CA3AF" />
          <Text style={styles.tipText}>
            Tap the heart icon while coloring to save
          </Text>
        </View>
      </View>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#E46444" />
      <Text style={styles.loadingText}>Loading your artwork...</Text>
    </View>
  );

  const renderArtworkGrid = () => (
    <View style={styles.gridContainer}>
      <Text style={styles.sectionTitle}>
        {artworks.length} Saved Artwork{artworks.length !== 1 ? "s" : ""}
      </Text>
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
              resizeMode="cover"
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
        <AppHeader
          credits={headerData.credits}
          challengeProgress={headerData.challengeProgress}
          stickerCount={headerData.stickerCount}
          profileName={headerData.profileName}
          coloStage={headerData.coloStage}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={
            artworks.length === 0
              ? styles.emptyScrollContent
              : styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading
            ? renderLoading()
            : artworks.length === 0
              ? renderEmptyState()
              : renderArtworkGrid()}
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
  sectionTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
    marginBottom: 16,
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
