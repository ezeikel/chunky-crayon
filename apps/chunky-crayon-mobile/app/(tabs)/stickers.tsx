import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar, faLock, faCheck } from "@fortawesome/pro-solid-svg-icons";
import AppHeader from "@/components/AppHeader";
import StickerDetailSheet, {
  type StickerDetail,
} from "@/components/StickerDetailSheet";
import useHeaderData from "@/hooks/useHeaderData";
import { useStickers, useMarkStickersAsViewed } from "@/hooks/api";
import { useT } from "@/lib/i18n/useT";
import { STICKER_IMAGES } from "@/lib/stickers";

type StickerCategory = {
  id: string;
  name: string;
  stickers: Sticker[];
};

type Sticker = {
  id: string;
  name: string;
  imageUrl: string;
  isUnlocked: boolean;
  isNew?: boolean;
  category: string;
  rarity: string;
  unlockedAt: string | null;
};

type StickerItemProps = {
  sticker: Sticker;
  onPress: () => void;
};

const StickerItem = ({ sticker, onPress }: StickerItemProps) => {
  const t = useT("mobile.stickers");
  const image = STICKER_IMAGES[sticker.id];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.stickerItem,
        !sticker.isUnlocked && styles.stickerItemLocked,
        pressed && styles.stickerItemPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.stickerArt}>
        {/* Real bundled sticker PNG (web parity: web's StickerCard renders
            sticker.imageUrl). Locked = dimmed, matching web's grayscale/
            opacity treatment (RN Image has no CSS grayscale, so dim via
            opacity on the locked tile + this lower opacity). */}
        <Image
          source={image}
          style={[
            styles.stickerImage,
            !sticker.isUnlocked && styles.stickerImageLocked,
          ]}
          contentFit="contain"
          transition={150}
        />
        {!sticker.isUnlocked && (
          <View style={styles.lockOverlay}>
            <FontAwesomeIcon icon={faLock} size={16} color="#9CA3AF" />
          </View>
        )}
      </View>
      {sticker.isNew && sticker.isUnlocked && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{t("new")}</Text>
        </View>
      )}
    </Pressable>
  );
};

const StickersScreen = () => {
  const t = useT("mobile.stickers");
  const headerData = useHeaderData();
  const { data, isLoading } = useStickers();
  const markAsViewed = useMarkStickersAsViewed();
  const [selectedSticker, setSelectedSticker] = useState<StickerDetail | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // Group stickers by category
  const stickerCategories = useMemo(() => {
    if (!data?.stickers) return [];

    const categoryMap = new Map<string, Sticker[]>();

    data.stickers.forEach((sticker) => {
      const category = sticker.category || "other";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        id: sticker.id,
        name: sticker.name,
        imageUrl: sticker.imageUrl,
        isUnlocked: sticker.isUnlocked,
        isNew: sticker.isNew,
        category: sticker.category,
        rarity: sticker.rarity,
        unlockedAt: sticker.unlockedAt,
      });
    });

    // Convert to array and capitalize category names
    return Array.from(categoryMap.entries()).map(([id, stickers]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      stickers,
    }));
  }, [data?.stickers]);

  const totalStickers = data?.stats.totalPossible ?? 0;
  const unlockedStickers = data?.stats.totalUnlocked ?? 0;

  const handleStickerPress = (sticker: Sticker) => {
    // Mark as viewed if it's new
    if (sticker.isNew) {
      markAsViewed.mutate([sticker.id]);
    }
    // Open the detail sheet (works for locked + unlocked — locked shows
    // the how-to-unlock hint, like web's StickerDetailModal).
    setSelectedSticker({
      id: sticker.id,
      name: sticker.name,
      rarity: sticker.rarity,
      isUnlocked: sticker.isUnlocked,
      unlockedAt: sticker.unlockedAt,
    });
    setSheetOpen(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <AppHeader
          credits={headerData.credits}
          profileName={headerData.profileName}
          avatarId={headerData.avatarId}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("title")}</Text>
            <View style={styles.collectionProgress}>
              <FontAwesomeIcon icon={faStar} size={16} color="#F59E0B" />
              <Text style={styles.collectionText}>
                {t("collected", {
                  unlocked: unlockedStickers,
                  total: totalStickers,
                })}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E46444" />
              <Text style={styles.loadingText}>{t("loading")}</Text>
            </View>
          ) : (
            <>
              {/* Sticker Categories */}
              {stickerCategories.map((category) => (
                <View key={category.id} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category.name}</Text>
                  <View style={styles.stickersGrid}>
                    {category.stickers.map((sticker) => (
                      <StickerItem
                        key={sticker.id}
                        sticker={sticker}
                        onPress={() => handleStickerPress(sticker)}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {/* Unlock Hint */}
              <View style={styles.hintContainer}>
                <FontAwesomeIcon icon={faCheck} size={14} color="#10B981" />
                <Text style={styles.hintText}>{t("hint")}</Text>
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>

      <StickerDetailSheet
        sticker={selectedSticker}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 16,
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
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 28,
    color: "#374151",
    marginBottom: 8,
  },
  collectionProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  collectionText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#374151",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stickersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  stickerItem: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  stickerItemLocked: {
    opacity: 0.5,
  },
  stickerItemPressed: {
    transform: [{ scale: 0.95 }],
  },
  stickerArt: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerImage: {
    width: "100%",
    height: "100%",
  },
  stickerImageLocked: {
    // RN <Image> has no CSS grayscale; the tile already dims to 0.5 via
    // stickerItemLocked, and this drops the art further so locked stickers
    // read as "not yet earned" like web's grayscale+opacity treatment.
    opacity: 0.4,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 8,
  },
  newBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#E46444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    marginTop: 8,
  },
  hintText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
});

export default StickersScreen;
