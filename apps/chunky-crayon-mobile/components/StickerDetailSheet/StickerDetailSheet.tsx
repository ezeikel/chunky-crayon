import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStar,
  faLock,
  faPartyHorn,
} from "@fortawesome/pro-duotone-svg-icons";
import { COLORS, CRAYON, FONTS } from "@/lib/design";

/**
 * Sticker detail bottom sheet — mobile port of web's StickerDetailModal.
 * Per the native form-factor doc, a contextual detail like this is a
 * bottom sheet (not a full-screen modal): tap a sticker in the book → it
 * slides up with the big sticker, its rarity stars, and either the unlock
 * celebration (unlocked) or how-to-unlock hint (locked).
 *
 * Mobile uses emoji placeholders (the sticker-image pipeline isn't wired
 * yet), so the "big sticker" is the emoji at large size, dimmed when
 * locked. Rarity renders as 1-4 filled stars, matching web (kids count
 * stars, they don't read "rare").
 */

export type StickerDetail = {
  id: string;
  name: string;
  emoji: string;
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
                {isUnlocked ? sticker.name : "Locked sticker"}
              </Text>

              {/* Big sticker — full emoji unlocked, dimmed + lock badge locked */}
              <View
                style={[
                  styles.bigTile,
                  isUnlocked ? styles.bigTileUnlocked : styles.bigTileLocked,
                ]}
              >
                <Text
                  style={[
                    styles.bigEmoji,
                    !isUnlocked && styles.bigEmojiLocked,
                  ]}
                >
                  {sticker.emoji}
                </Text>
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
                    <Text style={styles.unlockMessage}>You unlocked this!</Text>
                  )}
                  {sticker.unlockedAt && (
                    <Text style={styles.unlockedDate}>
                      Unlocked{" "}
                      {new Date(sticker.unlockedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
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
                    {sticker.unlockHint ??
                      "Keep coloring to unlock this sticker!"}
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
    backgroundColor: "#F3F4F6",
  },
  bigEmoji: {
    fontSize: 72,
  },
  bigEmojiLocked: {
    opacity: 0.3,
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
