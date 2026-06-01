import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTriangleExclamation } from "@fortawesome/pro-solid-svg-icons";
import { tapMedium } from "@/utils/haptics";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Kid-friendly destructive-confirm replacement for Alert.alert(...
 * [{Cancel}, {Destroy}]) flows. Lives as a bottom sheet so the
 * experience stays in-app and brand-styled rather than dropping into
 * iOS's system Alert. Per user direction, ALL Alert.alert calls on
 * mobile are being moved off — transient feedback to sonner-native
 * toasts, destructive confirms here.
 *
 * Shape:
 *   ⚠ icon (red triangle)
 *   Bold title (e.g. "Start over?")
 *   Description (e.g. "Are you sure? This will erase all your coloring!")
 *   [Cancel] [Destructive primary]
 *
 * Use `tone="destructive"` (default) for delete/erase/sign-out flows
 * — the primary button renders coral-red. Use `tone="confirm"` for
 * neutral confirmations (no destructive copy) — primary renders the
 * brand orange.
 */

type ConfirmSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Bold headline at the top. */
  title: string;
  /** Body copy below the title. */
  description?: string;
  /** Label on the primary action button. */
  confirmLabel: string;
  /** Label on the secondary (dismiss) button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Fired when the primary button is tapped. Sheet closes after. */
  onConfirm: () => void;
  /**
   * 'destructive' (default) = red primary button + ⚠ icon for
   * erase / delete / sign-out flows. 'confirm' = brand orange primary
   * for neutral yes/no.
   */
  tone?: "destructive" | "confirm";
};

const ConfirmSheet = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "destructive",
}: ConfirmSheetProps) => {
  const insets = useSafeAreaInsets();

  // Controlled modal sheet: index 0 = closed, index 1 = open at content
  // height. Collapsing (scrim tap / swipe-down) reports index 0.
  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const handleConfirm = () => {
    tapMedium();
    onConfirm();
    onClose();
  };

  const isDestructive = tone === "destructive";
  const primaryBg = isDestructive ? COLORS.error : COLORS.crayonOrange;

  // Only mount the sheet while open. `ModalBottomSheet` at index 0 is
  // "mounted but collapsed", not unmounted — its surface peeks above the
  // bottom edge even when closed, which read as a phantom second dialog
  // stacked under other modals. Gating on `isOpen` removes the peek entirely;
  // when open it sits at index 1 (content height).
  if (!isOpen) return null;

  return (
    <ModalBottomSheet
      index={1}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handleIndicator} />
        <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          {isDestructive && (
            <View style={styles.iconCircle}>
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                size={28}
                color={COLORS.error}
              />
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onClose();
              }}
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                { backgroundColor: primaryBg },
                pressed && styles.pressed,
              ]}
              onPress={handleConfirm}
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
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
    paddingTop: 16,
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EBE0",
  },
  cancelText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textWarmMuted,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});

export default ConfirmSheet;
