import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCheck, faXmark } from "@fortawesome/pro-solid-svg-icons";
import { tapMedium } from "@/utils/haptics";
import { FONTS, COLORS, SHEET_HANDLE } from "@/lib/design";
import SquishyPressable from "@/components/SquishyPressable/SquishyPressable";

/**
 * Kid-friendly "do this action" bottom sheet — the non-destructive sibling of
 * ConfirmSheet, sharing its exact visual style (handle, tinted icon circle,
 * bold title, round ✕/✓ buttons on SquishyPressable). Used for the coloring
 * rail's Save / Print / My Artwork tiles: each tile opens its own sheet, the
 * green ✓ fires the action, the white ✕ backs out. Same kid mental model as
 * Start Over ("a sheet slides up, tap the green check to go"), but the icon
 * circle is brand-orange (friendly) rather than ConfirmSheet's destructive red.
 *
 * Shape:
 *   ◐ icon (tinted circle)        ← configurable via `icon` / `iconTint`
 *   Bold title (e.g. "Save your picture?")
 *   ( ✕ )   [ optional extra ]   ( ✓ )   ← round icon buttons
 *
 * The optional `extraAction` renders a third round button left of the ✓ — used
 * by the Save sheet to also offer Share without a separate rail tile.
 */

type ActionSheetAction = {
  /** Round-button glyph. */
  icon: IconDefinition;
  /** Accessibility label (not rendered as visible text). */
  label: string;
  onPress: () => void;
  /** 'primary' = green fill, 'neutral' = white + cream border. Default primary. */
  tone?: "primary" | "neutral";
};

type ActionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Bold headline at the top. */
  title: string;
  /** Optional body copy below the title (omit for the icon-led shape). */
  description?: string;
  /** "What happens" header icon, shown in a tinted circle. */
  icon: IconDefinition;
  /** Header icon color. Default brand orange. */
  iconTint?: string;
  /** Header icon-circle background. Default a soft brand-orange tint. */
  iconCircleColor?: string;
  /** Accessibility label for the confirm ✓ button (not visible text). */
  confirmLabel: string;
  /** Fired when the ✓ is tapped. The sheet does NOT auto-close — the handler
   *  closes its own sheet once its async work resolves (matches the per-action
   *  Save/Print/MyArtwork handlers, which toast + setShow*Sheet(false)). */
  onConfirm: () => void;
  /** Optional extra round button rendered LEFT of the ✓ (e.g. Share). */
  extraAction?: ActionSheetAction;
  /** Dims/disables the ✓ while the action runs. */
  loading?: boolean;
};

const ActionSheet = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconTint = COLORS.primary,
  iconCircleColor = "rgba(228, 100, 68, 0.12)",
  confirmLabel,
  onConfirm,
  extraAction,
  loading = false,
}: ActionSheetProps) => {
  const insets = useSafeAreaInsets();

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const handleConfirm = () => {
    if (loading) return;
    tapMedium();
    onConfirm();
  };

  // Only mount while open — a ModalBottomSheet at index 0 stays mounted-but-
  // collapsed and its surface peeks above the bottom edge. Gating removes that.
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
          <View
            style={[styles.iconCircle, { backgroundColor: iconCircleColor }]}
          >
            <FontAwesomeIcon icon={icon} size={28} color={iconTint} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Round icon buttons — ✕ to back out (white), optional extra, then
              the green ✓ to do it. No word labels: kids parse the glyphs; the
              labels live on as accessibility hints. SquishyPressable so the
              press feel + haptic match every other tappable. */}
          <View style={styles.actions}>
            <SquishyPressable
              onPress={onClose}
              scaleTo={0.9}
              accessibilityLabel="Cancel"
            >
              <View style={[styles.iconButton, styles.cancelButton]}>
                <FontAwesomeIcon
                  icon={faXmark}
                  size={30}
                  color={COLORS.textPrimary}
                />
              </View>
            </SquishyPressable>

            {extraAction ? (
              <SquishyPressable
                onPress={extraAction.onPress}
                scaleTo={0.9}
                accessibilityLabel={extraAction.label}
              >
                <View
                  style={[
                    styles.iconButton,
                    extraAction.tone === "neutral"
                      ? styles.cancelButton
                      : styles.confirmButton,
                  ]}
                >
                  <FontAwesomeIcon
                    icon={extraAction.icon}
                    size={28}
                    color={
                      extraAction.tone === "neutral"
                        ? COLORS.textPrimary
                        : COLORS.white
                    }
                  />
                </View>
              </SquishyPressable>
            ) : null}

            <SquishyPressable
              onPress={handleConfirm}
              scaleTo={0.9}
              accessibilityLabel={confirmLabel}
            >
              <View
                style={[
                  styles.iconButton,
                  styles.confirmButton,
                  loading && styles.confirmButtonLoading,
                ]}
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  size={30}
                  color={COLORS.white}
                />
              </View>
            </SquishyPressable>
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
    paddingTop: 16,
  },
  // Shared canonical sheet handle (matches the coloring drawer + all sheets).
  handleIndicator: {
    ...SHEET_HANDLE,
    marginBottom: 8,
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
    gap: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  iconButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  confirmButton: {
    backgroundColor: COLORS.mint,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonLoading: {
    opacity: 0.5,
  },
});

export default ActionSheet;
