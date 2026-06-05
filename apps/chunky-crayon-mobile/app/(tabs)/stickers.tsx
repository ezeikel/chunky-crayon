import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Spinner from "@/components/Spinner/Spinner";
import LockedStickerArt from "@/components/LockedStickerArt";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar, faCheck } from "@fortawesome/pro-solid-svg-icons";
import { faLock, faMedal, faPaw } from "@fortawesome/pro-duotone-svg-icons";
import AppHeader from "@/components/AppHeader";
import StickerDetailSheet, {
  type StickerDetail,
} from "@/components/StickerDetailSheet";
import useHeaderData from "@/hooks/useHeaderData";
import { useStickers, useMarkStickersAsViewed } from "@/hooks/api";
import { useT } from "@/lib/i18n/useT";
import { STICKER_IMAGES } from "@/lib/stickers";
import { COLORS } from "@/lib/design";

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

// Rarity ring colour (web parity: rarityRing). Kids read colour, not labels.
const RARITY_BORDER: Record<string, string> = {
  common: COLORS.bgCreamDark,
  uncommon: "#7FB069",
  rare: "#C18B9D",
  legendary: "#F59E0B",
};

const StickerItem = ({ sticker, onPress }: StickerItemProps) => {
  const image = STICKER_IMAGES[sticker.id];
  const unlocked = sticker.isUnlocked;
  // The API already returns a human-readable sticker name (web resolves it via
  // a stickerCatalog i18n bundle that mobile doesn't ship — use the name field).
  const name = sticker.name;
  const ringColor = unlocked
    ? (RARITY_BORDER[sticker.rarity] ?? COLORS.bgCreamDark)
    : COLORS.bgCreamDark;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.stickerItem,
        { borderColor: ringColor },
        !unlocked && styles.stickerItemLocked,
        pressed && styles.stickerItemPressed,
      ]}
      onPress={onPress}
    >
      {/* Art fills the card and is CENTRED via contain + flex (web's flex-1
          + object-contain). Unlocked = full-colour expo-image. Locked = a TRUE
          grayscale ghost via Skia ColorMatrix (web parity: CSS `grayscale
          opacity-30 blur-[0.5px]`) — the hue is stripped but the tonal range
          survives, so the linework/crown/cape stay legible. Skia only mounts on
          locked tiles, so the surface count shrinks to zero as stickers unlock. */}
      {unlocked ? (
        <Image
          source={image}
          style={styles.stickerImage}
          contentFit="contain"
          transition={150}
        />
      ) : (
        <LockedStickerArt source={image} style={styles.stickerImage} />
      )}

      {/* Name label under the sticker — always shown (web parity). */}
      <Text
        style={[styles.stickerName, !unlocked && styles.stickerNameLocked]}
        numberOfLines={1}
      >
        {name}
      </Text>

      {/* Lock badge — top-right, big + obvious (web's -top-3 -right-3). */}
      {!unlocked && (
        <View style={styles.lockBadge}>
          <FontAwesomeIcon
            icon={faLock}
            size={14}
            color={COLORS.textMuted}
            secondaryColor={COLORS.bgCreamDark}
            secondaryOpacity={1}
          />
        </View>
      )}

      {/* NEW star badge — freshly unlocked (web's orange star). */}
      {unlocked && sticker.isNew && (
        <View style={styles.newBadge}>
          <FontAwesomeIcon icon={faStar} size={14} color="#FFFFFF" />
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
  // Encouragement message under the progress bar — same tiers + wording as web's
  // ProgressBar (greatStart < 50% ≤ halfway < 75% ≤ almost < 100% = complete).
  const progressPct =
    totalStickers > 0
      ? Math.round((unlockedStickers / totalStickers) * 100)
      : 0;
  const progressMessage =
    progressPct >= 100
      ? t("progressComplete")
      : progressPct >= 75
        ? t("progressAlmost")
        : progressPct >= 50
          ? t("progressHalfway")
          : t("progressGreatStart");

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
          {/* Header — title, count, and a filled progress bar with a star
              endcap (web's Sticker Collection progress). */}
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
            {totalStickers > 0 && (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, Math.round((unlockedStickers / totalStickers) * 100))}%`,
                    },
                  ]}
                />
                <View style={styles.progressStar}>
                  <FontAwesomeIcon icon={faStar} size={12} color="#FFFFFF" />
                </View>
              </View>
            )}
            {totalStickers > 0 && (
              <Text style={styles.progressMessage}>{progressMessage}</Text>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Spinner size={40} />
              <Text style={styles.loadingText}>{t("loading")}</Text>
            </View>
          ) : (
            <>
              {/* Sticker sections — each gets a coloured icon badge + an
                  "unlocked / total" count under the title (web parity). The
                  milestone section gets a gold medal; the rest get a paw. */}
              {stickerCategories.map((category) => {
                const isMilestone = /milestone/i.test(category.id);
                const sectionUnlocked = category.stickers.filter(
                  (s) => s.isUnlocked,
                ).length;
                return (
                  <View key={category.id} style={styles.categorySection}>
                    <View style={styles.sectionHeaderRow}>
                      <View
                        style={[
                          styles.sectionBadge,
                          isMilestone
                            ? styles.sectionBadgeGold
                            : styles.sectionBadgePaw,
                        ]}
                      >
                        <FontAwesomeIcon
                          icon={isMilestone ? faMedal : faPaw}
                          size={18}
                          color={isMilestone ? "#F59E0B" : "#7FB069"}
                          secondaryColor={isMilestone ? "#FDD835" : "#A8D08D"}
                          secondaryOpacity={1}
                        />
                      </View>
                      <View>
                        <Text style={styles.categoryTitle}>
                          {category.name}
                        </Text>
                        <Text style={styles.sectionCount}>
                          {sectionUnlocked} / {category.stickers.length}
                        </Text>
                      </View>
                    </View>
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
                );
              })}

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
    paddingBottom: 128,
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
    marginBottom: 28,
  },
  // Section header: coloured icon medallion + title + "unlocked / total" count.
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeGold: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  sectionBadgePaw: {
    backgroundColor: "rgba(127, 176, 105, 0.16)",
  },
  categoryTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 19,
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  // Progress bar (web's Sticker Collection bar): cream track, orange fill,
  // a white star endcap riding the right edge.
  progressTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.bgCreamDark,
    marginTop: 12,
    justifyContent: "center",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.crayonOrange,
    borderRadius: 8,
    minWidth: 16,
  },
  progressStar: {
    position: "absolute",
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F0A98C",
    alignItems: "center",
    justifyContent: "center",
  },
  progressMessage: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  stickersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  // Square card, white, rarity-coloured border (set inline). Art fills + a
  // name label below, matching web's StickerCard. The chunky bottom shadow
  // gives the "stuck on" sticker-book feel.
  stickerItem: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  stickerItemLocked: {
    borderStyle: "dashed",
    backgroundColor: COLORS.bgCream,
  },
  stickerItemPressed: {
    transform: [{ scale: 0.95 }],
  },
  // Art FILLS the card area (flex:1) + contain → always centred. (The old
  // fixed-56px box let asymmetric PNG whitespace read as off-centre.)
  stickerImage: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 4,
  },
  stickerNameLocked: {
    color: COLORS.textMuted,
  },
  // Lock + NEW badges sit top-right, overhanging the corner (web's -top/-right).
  lockBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.crayonOrange,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
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
