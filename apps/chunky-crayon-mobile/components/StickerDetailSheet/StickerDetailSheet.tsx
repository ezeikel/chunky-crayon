import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStar,
  faLock,
  faPartyHorn,
} from "@fortawesome/pro-duotone-svg-icons";
import LockedStickerArt from "@/components/LockedStickerArt";
import { useT } from "@/lib/i18n/useT";
import { COLORS, CRAYON, FONTS } from "@/lib/design";
import { STICKER_IMAGES } from "@/lib/stickers";

/**
 * Sticker detail bottom sheet — mobile port of web's StickerDetailModal.
 * Per the native form-factor doc, a contextual detail like this is a
 * bottom sheet (not a full-screen modal): tap a sticker in the book → it
 * slides up with the big sticker, its rarity stars, and either the unlock
 * celebration (unlocked) or how-to-unlock hint (locked).
 *
 * The big sticker is the real bundled PNG (resolved by id via
 * STICKER_IMAGES), dimmed when locked — web parity with StickerDetailModal,
 * which renders sticker.imageUrl. Rarity renders as 1-4 filled stars,
 * matching web (kids count stars, they don't read "rare").
 */

export type StickerDetail = {
  id: string;
  name: string;
  rarity: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  /** How to unlock (locked state). Optional — falls back to generic copy. */
  unlockHint?: string;
  /** Celebration line (unlocked state). Optional. */
  unlockMessage?: string;
};

type StickerDetailSheetProps = {
  sticker: StickerDetail | null;
  isOpen: boolean;
  onClose: () => void;
};

const RARITY_STARS: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 4,
};

const StickerDetailSheet = ({
  sticker,
  isOpen,
  onClose,
}: StickerDetailSheetProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.stickers");

  // Controlled modal sheet: index 0 = closed, index 1 = open at content
  // height. Collapsing (scrim tap / swipe-down) reports index 0.
  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const stars = sticker ? (RARITY_STARS[sticker.rarity] ?? 1) : 1;
  const isUnlocked = sticker?.isUnlocked ?? false;

  return (
    <ModalBottomSheet
      index={isOpen ? 1 : 0}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.4)"
    >
      <View style={styles.surface}>
        <View style={styles.handle} />
        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {!sticker ? null : (
            <>
              <Text style={styles.title}>
                {isUnlocked
                  ? t(`achievement.${sticker.id}`, {
                      defaultValue: sticker.name,
                    })
                  : t("lockedTitle")}
              </Text>

              {/* Big sticker — real bundled PNG (web parity). Locked = a TRUE
                  grayscale ghost via the shared LockedStickerArt (Skia
                  ColorMatrix), same treatment as the grid so the two never
                  drift. Unlocked = full-colour expo-image. */}
              <View
                style={[
                  styles.bigTile,
                  isUnlocked ? styles.bigTileUnlocked : styles.bigTileLocked,
                ]}
              >
                {isUnlocked ? (
                  <Image
                    source={STICKER_IMAGES[sticker.id]}
                    style={styles.bigImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  <LockedStickerArt
                    source={STICKER_IMAGES[sticker.id]}
                    size={104}
                  />
                )}
                {!isUnlocked && (
                  <View style={styles.lockBadge}>
                    <FontAwesomeIcon
                      icon={faLock}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </View>
                )}
              </View>

              {/* Rarity stars */}
              <View style={styles.starsRow}>
                {[0, 1, 2, 3].map((i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    size={20}
                    color={i < stars ? COLORS.yellow : COLORS.bgCreamDark}
                    secondaryColor={
                      i < stars ? COLORS.yellow : COLORS.bgCreamDark
                    }
                    secondaryOpacity={1}
                  />
                ))}
              </View>

              {isUnlocked ? (
                <View style={styles.unlockedBlock}>
                  <View style={styles.celebrateBadge}>
                    <FontAwesomeIcon
                      icon={faPartyHorn}
                      size={22}
                      color={COLORS.crayonOrange}
                      secondaryColor={COLORS.yellow}
                      secondaryOpacity={1}
                    />
                  </View>
                  {sticker.unlockMessage ? (
                    <Text style={styles.unlockMessage}>
                      {sticker.unlockMessage}
                    </Text>
                  ) : (
                    <Text style={styles.unlockMessage}>
                      {t("unlockedDefault")}
                    </Text>
                  )}
                  {sticker.unlockedAt && (
                    <Text style={styles.unlockedDate}>
                      {t("unlockedOn", {
                        date: new Date(sticker.unlockedAt).toLocaleDateString(
                          undefined,
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        ),
                      })}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.lockedBlock}>
                  <View style={styles.lockHintBadge}>
                    <FontAwesomeIcon
                      icon={faLock}
                      size={16}
                      color={CRAYON.purple.base}
                      secondaryColor={CRAYON.pink.base}
                      secondaryOpacity={1}
                    />
                  </View>
                  <Text style={styles.lockHint}>
                    {sticker.unlockHint ?? t("unlockHintDefault")}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: COLORS.bgCreamDark,
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  content: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  bigTile: {
    width: 140,
    height: 140,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bigTileUnlocked: {
    backgroundColor: COLORS.bgCream,
  },
  bigTileLocked: {
    // Warm cream (matches the grid's locked tile) — not a cool grey, which
    // clashed with the app's warm palette.
    backgroundColor: COLORS.bgCream,
  },
  bigImage: {
    width: 104,
    height: 104,
  },
  lockBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.bgCreamDark,
    alignItems: "center",
    justifyContent: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
  },
  unlockedBlock: {
    alignItems: "center",
    gap: 8,
  },
  celebrateBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(228,100,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  unlockMessage: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.crayonOrange,
    textAlign: "center",
  },
  unlockedDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  lockedBlock: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bgCream,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lockHintBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(193,139,157,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockHint: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});

export default StickerDetailSheet;
