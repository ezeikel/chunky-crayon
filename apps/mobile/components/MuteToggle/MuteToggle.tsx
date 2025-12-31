import { Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faVolumeHigh, faVolumeMute } from "@fortawesome/pro-solid-svg-icons";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight } from "@/utils/haptics";

type MuteToggleProps = {
  style?: Record<string, unknown>;
};

/**
 * Kid-friendly mute toggle for mobile coloring canvas.
 * Toggles ambient sound on/off with visual feedback.
 *
 * Features:
 * - Large touch target (40pt+) for young children
 * - Clear visual state (speaker icon changes)
 * - Haptic feedback on tap
 * - Coral color scheme (#E46444)
 */
const MuteToggle = ({ style }: MuteToggleProps) => {
  const { isMuted, toggleMuted } = useCanvasStore();

  const handleToggle = () => {
    tapLight();
    toggleMuted();
  };

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.container,
        isMuted && styles.containerMuted,
        pressed && styles.pressed,
        style,
      ]}
    >
      <FontAwesomeIcon
        icon={isMuted ? faVolumeMute : faVolumeHigh}
        size={18}
        color={isMuted ? "#9CA3AF" : "#E46444"}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerMuted: {
    backgroundColor: "#F3F4F6",
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
});

export default MuteToggle;
