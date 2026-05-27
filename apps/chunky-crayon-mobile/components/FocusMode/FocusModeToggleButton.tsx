import { Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faExpand, faXmark } from "@fortawesome/pro-solid-svg-icons";
import { useFocusMode } from "./FocusModeProvider";
import { tapLight } from "@/utils/haptics";
import { COLORS } from "@/lib/design";

/**
 * Inline button that toggles focus mode. Drops next to
 * ZoomControls (or anywhere a tool affordance lives) in normal mode;
 * hides when focus mode is active so the canvas chrome stays clean —
 * the floating X exit (FocusModeFloatingExit) takes over.
 *
 * Mirrors web's FocusModeToggleButton.tsx — same icon swap
 * (expand → xmark), same hideInFocusMode prop. The default is to
 * render only in normal mode (hideInFocusMode=true) since the
 * floating exit is the canonical exit affordance on mobile.
 */

type FocusModeToggleButtonProps = {
  /**
   * When true (default), the button hides while focus mode is active.
   * Set to false if you want a single button that toggles in + out
   * from the same spot (web does this on tablet/desktop; mobile
   * defaults to the separate floating exit).
   */
  hideInFocusMode?: boolean;
  style?: object;
};

const FocusModeToggleButton = ({
  hideInFocusMode = true,
  style,
}: FocusModeToggleButtonProps) => {
  const { isFocusMode, toggleFocus } = useFocusMode();

  if (hideInFocusMode && isFocusMode) return null;

  return (
    <Pressable
      onPress={() => {
        tapLight();
        toggleFocus();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      accessibilityLabel={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
    >
      <FontAwesomeIcon
        icon={isFocusMode ? faXmark : faExpand}
        size={20}
        color={COLORS.crayonOrange}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});

export default FocusModeToggleButton;
