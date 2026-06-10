import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";
import { useFocusMode } from "./FocusModeProvider";
import { tapLight } from "@/utils/haptics";
import { useT } from "@/lib/i18n/useT";

/**
 * Floating exit X shown only when focus mode is active. Pins to the
 * top-right corner with safe-area respect (iPad notch / Dynamic
 * Island clearance).
 *
 * Mirrors web's FocusModeFloatingExit.tsx — z-index above
 * everything (RN doesn't have z-index in the same sense; positioning
 * absolute on a top-level layer is enough), white circle with thin
 * border, faXmark icon. Same `top: max(safe-area, 16)` rule so it
 * never sits under iOS chrome.
 */

const SIZE = 44;

type FocusModeFloatingExitProps = {
  /**
   * Extra right offset (px) so the X clears a sidebar that stays visible in
   * focus mode. On iPad/landscape the tools rail stays, so pass its width →
   * the X sits at the top-right of the CANVAS area, clear of the rail. On phone
   * the rail is gone (0) and it pins to the screen corner.
   */
  rightInset?: number;
};

const FocusModeFloatingExit = ({
  rightInset = 0,
}: FocusModeFloatingExitProps) => {
  const t = useT("mobile.coloring");
  const { isFocusMode, exitFocus } = useFocusMode();
  const insets = useSafeAreaInsets();

  if (!isFocusMode) return null;

  return (
    <Pressable
      onPress={() => {
        tapLight();
        exitFocus();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          top: Math.max(insets.top, 16),
          right: Math.max(insets.right, 16) + rightInset,
        },
        pressed && styles.pressed,
      ]}
      accessibilityLabel={t("exitFocusMode")}
    >
      <FontAwesomeIcon icon={faXmark} size={20} color="#3D2C1E" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E8DFD6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});

export default FocusModeFloatingExit;
