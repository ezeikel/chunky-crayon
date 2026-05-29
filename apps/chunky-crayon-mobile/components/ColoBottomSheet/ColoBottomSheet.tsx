import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSparkles, faTrophy } from "@fortawesome/pro-solid-svg-icons";
import ColoAvatar from "@/components/ColoAvatar";
import { getAccessory } from "@/lib/colo";
import type { ColoState } from "@/lib/colo";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Kid-friendly Colo detail sheet — mobile port of web's
 * apps/chunky-crayon-web/components/Header/HeaderColoIndicator.tsx
 * dropdown body. Same kid-readable layout:
 *
 *   - Avatar (large) + stage name (centered)
 *   - Visual progress bar (no fraction text — the cap in
 *     getColoState already clamps current at required so the bar
 *     hits 100% without overshooting)
 *   - "Ready to grow!" celebration when bar is at 100%
 *   - Trophy badge if max stage (no nextStage)
 *   - Accessories row (icons only, max 6 + "+N" overflow chip)
 *
 * Tap target on mobile is the ColoAvatar inside AppHeader's profile
 * pill. Profile pill's other half (name + chevron) opens
 * ProfileSwitcher; this sheet is for Colo-specific peek.
 */

type ColoBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Colo state from the colo context. `null` = sheet is a no-op. */
  coloState: ColoState | null;
};

const ColoBottomSheet = ({
  isOpen,
  onClose,
  coloState,
}: ColoBottomSheetProps) => {
  const insets = useSafeAreaInsets();

  // Controlled sheet: detents default to [0 (collapsed), 'content'].
  // index 0 = closed, index 1 = open at content height. Collapsing
  // (scrim tap / swipe-down) reports index 0 via onIndexChange.
  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  // Compute the progress percentage once. getColoState clamps current
  // at required so the bar tops out at 100% — no Math.min wrapper
  // needed here, but keep the defensive clamp matching web.
  const progressPercentage = coloState?.progressToNext
    ? Math.min(100, Math.max(0, coloState.progressToNext.percentage))
    : 0;
  const isReady = progressPercentage >= 100;
  const isMaxStage = coloState?.nextStage == null;

  return (
    <ModalBottomSheet
      index={isOpen ? 1 : 0}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handleIndicator} />
        {!coloState ? null : (
          <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
            {/* Avatar + stage name. Avatar carries identity, name is the
              only block of text. */}
            <View style={styles.headerBlock}>
              <ColoAvatar
                coloState={coloState}
                stage={coloState.stage}
                size="xl"
                enableTapReactions={false}
              />
              <Text style={styles.stageName}>{coloState.stageName}</Text>
            </View>

            {/* Progress bar — visual only, no fraction. */}
            {!isMaxStage && coloState.progressToNext && (
              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
                {isReady && (
                  <View style={styles.readyRow}>
                    <FontAwesomeIcon
                      icon={faSparkles}
                      size={14}
                      color={COLORS.crayonOrange}
                    />
                    <Text style={styles.readyText}>Ready to grow!</Text>
                  </View>
                )}
              </View>
            )}

            {/* Max stage — trophy badge replaces the progress bar. */}
            {isMaxStage && (
              <View style={styles.maxStageBlock}>
                <FontAwesomeIcon icon={faTrophy} size={36} color="#F5C518" />
              </View>
            )}

            {/* Accessories — icons only, no count header. */}
            {coloState.accessories.length > 0 && (
              <View style={styles.accessoriesRow}>
                {coloState.accessories.slice(0, 6).map((accessoryId) => {
                  const accessory = getAccessory(accessoryId);
                  if (!accessory) return null;
                  return (
                    <View
                      key={accessoryId}
                      style={styles.accessoryChip}
                      accessibilityLabel={accessory.name}
                    >
                      {/* The accessory imagePath is a string ID that
                        callers map to a bundled asset. For now render
                        as an emoji-like text fallback since the
                        accessory sprites aren't bundled on mobile yet. */}
                      <Text style={styles.accessoryEmoji}>✨</Text>
                    </View>
                  );
                })}
                {coloState.accessories.length > 6 && (
                  <View
                    style={[styles.accessoryChip, styles.accessoryOverflow]}
                  >
                    <Text style={styles.accessoryOverflowText}>
                      +{coloState.accessories.length - 6}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#FDFAF5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  handleIndicator: {
    alignSelf: "center",
    backgroundColor: COLORS.borderLight,
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 20,
  },
  headerBlock: {
    alignItems: "center",
    gap: 12,
  },
  stageName: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.crayonOrange,
    textAlign: "center",
  },
  progressBlock: {
    gap: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.bgPeach,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: COLORS.crayonOrange,
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  readyText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.crayonOrange,
  },
  maxStageBlock: {
    alignItems: "center",
    paddingVertical: 8,
  },
  accessoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  accessoryChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(228, 100, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  accessoryEmoji: {
    fontSize: 18,
  },
  accessoryOverflow: {
    backgroundColor: COLORS.borderLight,
  },
  accessoryOverflowText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textWarmMuted,
  },
});

export default ColoBottomSheet;
