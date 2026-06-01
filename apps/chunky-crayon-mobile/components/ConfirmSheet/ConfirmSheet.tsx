import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faTrash, faCheck, faXmark } from "@fortawesome/pro-solid-svg-icons";
import { tapMedium } from "@/utils/haptics";
import { FONTS, COLORS } from "@/lib/design";
import SquishyPressable from "@/components/SquishyPressable/SquishyPressable";

/**
 * Kid-friendly destructive-confirm replacement for Alert.alert(...
 * [{Cancel}, {Destroy}]) flows. Lives as a bottom sheet so the
 * experience stays in-app and brand-styled rather than dropping into
 * iOS's system Alert. Per user direction, ALL Alert.alert calls on
 * mobile are being moved off — transient feedback to sonner-native
 * toasts, destructive confirms here.
 *
 * Icon-led for the 3-8 audience (mirrors CC web's StartOverButton dialog
 * exactly): a big "what happens" icon in a tinted circle (trash for
 * erase/delete), a short bold title, and TWO ROUND ICON BUTTONS — a white
 * ✕ to back out, a green ✓ to confirm. No paragraph of body text and no
 * word labels on the buttons; pre-readers parse the icons, the labels live
 * on as accessibility hints for screen readers / parents.
 *
 * Shape:
 *   🗑 icon (red circle)         ← configurable via `icon`
 *   Bold title (e.g. "Start over?")
 *   ( ✕ )            ( ✓ )       ← round icon buttons
 *
 * `tone` only tints the confirm ✓ button: 'destructive' (default) keeps the
 * brand crayon-green affirmative (matches web — green = "yes, do it");
 * 'confirm' is identical here but kept for call-site intent.
 */

type ConfirmSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Bold headline at the top. */
  title: string;
  /**
   * Optional body copy below the title. Omit for the kid-facing icon-led
   * shape (the icon + title carry the meaning); pass it only where a
   * parent-facing nuance genuinely needs words.
   */
  description?: string;
  /**
   * "What happens" header icon, shown in a tinted circle. Defaults to a
   * plain trash bin (erase/delete). Pass a different glyph for non-erase
   * confirms (e.g. sign-out).
   */
  icon?: IconDefinition;
  /**
   * Accessibility label for the confirm ✓ button (screen readers / parents).
   * Not rendered as visible text.
   */
  confirmLabel: string;
  /**
   * Accessibility label for the cancel ✕ button. Defaults to "Cancel".
   * Not rendered as visible text.
   */
  cancelLabel?: string;
  /** Fired when the primary button is tapped. Sheet closes after. */
  onConfirm: () => void;
  /**
   * Reserved for call-site intent; both values render the same green
   * affirmative ✓ (matches web). 'destructive' is the default.
   */
  tone?: "destructive" | "confirm";
};

const ConfirmSheet = ({
  isOpen,
  onClose,
  title,
  description,
  icon = faTrash,
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
          {/* "What happens" icon in a tinted circle (web parity). */}
          <View style={styles.iconCircle}>
            <FontAwesomeIcon icon={icon} size={28} color={COLORS.error} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Two round icon buttons — ✕ to back out (white), ✓ to confirm
              (green). No word labels: pre-readers parse the glyphs; the
              labels live on as accessibility hints. Built on SquishyPressable
              so the press feel + haptic match every other tappable. */}
          <View style={styles.actions}>
            <SquishyPressable
              onPress={onClose}
              scaleTo={0.9}
              accessibilityLabel={cancelLabel}
            >
              <View style={[styles.iconButton, styles.cancelButton]}>
                <FontAwesomeIcon
                  icon={faXmark}
                  size={30}
                  color={COLORS.textPrimary}
                />
              </View>
            </SquishyPressable>
            <SquishyPressable
              onPress={handleConfirm}
              scaleTo={0.9}
              accessibilityLabel={confirmLabel}
            >
              <View style={[styles.iconButton, styles.confirmButton]}>
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
  // Two round icon buttons, centred with a comfortable gap (web spacing).
  actions: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  // 64pt circle — comfortably past the 44pt min touch target for small hands.
  iconButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // ✕ — white with a 2px cream border (web's "back out" affordance).
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  // ✓ — crayon-green "yes, do it" (web parity; green reads as the safe go).
  confirmButton: {
    backgroundColor: COLORS.mint,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default ConfirmSheet;
