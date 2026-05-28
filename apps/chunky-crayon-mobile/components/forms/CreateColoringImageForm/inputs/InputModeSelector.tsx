import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faShapes,
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { COLORS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";
import ParentalGate from "@/components/ParentalGate";
import { useUnlockedModes } from "@/hooks/api";
import { isGateableMode, type GateableMode } from "@/lib/scene/modes";
import { useInputMode, type InputMode } from "./InputModeContext";

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
  label: string;
  icon: IconDefinition;
  /** Scene Builder is never gateable; the other three are. */
  gateable: boolean;
};

// =============================================================================
// Constants
// =============================================================================

// Scene first — the privacy-first default. The other three let a kid feed
// arbitrary input into the AI, so they sit behind a one-time parent gate.
// Once passed, the unlock persists (DB + AsyncStorage) and we never re-ask.
// NO lock badge on gated tiles: every tile looks identical and ready. The
// gate fires on TAP — a visible lock reads as a paywall and kills the adult
// trial tap (matches web; feedback_cc_create_mode_parent_gating).
const INPUT_OPTIONS: InputOption[] = [
  { mode: "scene", label: "Build", icon: faShapes, gateable: false },
  { mode: "text", label: "Type", icon: faPencil, gateable: true },
  { mode: "voice", label: "Talk", icon: faMicrophoneLines, gateable: true },
  { mode: "image", label: "Photo", icon: faCameraRetro, gateable: true },
];

// =============================================================================
// Tile
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TileProps = {
  option: InputOption;
  isActive: boolean;
  isDisabled: boolean;
  onPress: () => void;
};

const InputModeTile = ({
  option,
  isActive,
  isDisabled,
  onPress,
}: TileProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive ? 1.05 : 1) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.tile,
        isActive ? styles.tileActive : styles.tileInactive,
        isDisabled && styles.tileDisabled,
        animatedStyle,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${option.label} input mode`}
    >
      <FontAwesomeIcon
        icon={option.icon}
        size={28}
        color={isActive ? COLORS.white : COLORS.crayonOrange}
        secondaryColor={
          isActive ? "rgba(255, 255, 255, 0.85)" : COLORS.crayonPeach
        }
        secondaryOpacity={1}
      />
    </AnimatedPressable>
  );
};

// =============================================================================
// Selector
// =============================================================================

type InputModeSelectorProps = {
  /** Disable all mode buttons */
  disabled?: boolean;
};

const InputModeSelector = ({ disabled }: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();
  const { isUnlocked, unlockMode } = useUnlockedModes();

  // The mode awaiting a parent-gate pass. Null = gate closed.
  const [pendingMode, setPendingMode] = useState<GateableMode | null>(null);

  const handleModeChange = async (option: InputOption) => {
    if (disabled || isProcessing) return;

    // Never gated, or already unlocked — just switch.
    if (
      !option.gateable ||
      (isGateableMode(option.mode) && isUnlocked(option.mode))
    ) {
      await tapLight();
      setMode(option.mode);
      return;
    }

    // Gated + locked — open the parent gate; the success handler persists
    // the unlock and flips the mode.
    if (isGateableMode(option.mode)) {
      await tapLight();
      setPendingMode(option.mode);
    }
  };

  const handleGateSuccess = async () => {
    const mode = pendingMode;
    setPendingMode(null);
    if (!mode) return;
    const ok = await unlockMode(mode);
    if (!ok) {
      // Local cache still flipped (best-effort), but warn the parent the
      // server didn't confirm so they know it may not stick across devices.
      toast.error("Couldn't save that unlock. It may not stick — try again.");
    }
    setMode(mode);
  };

  const handleGateClose = () => setPendingMode(null);

  return (
    <>
      <View style={styles.container} accessibilityRole="tablist">
        {INPUT_OPTIONS.map((option) => (
          <InputModeTile
            key={option.mode}
            option={option}
            isActive={option.mode === currentMode}
            isDisabled={!!disabled || isProcessing}
            onPress={() => handleModeChange(option)}
          />
        ))}
      </View>

      <ParentalGate
        visible={pendingMode !== null}
        onClose={handleGateClose}
        onSuccess={handleGateSuccess}
      />
    </>
  );
};

// =============================================================================
// Styles — mirror web's tile: 64pt rounded square, active orange fill,
// inactive white face with cream border. No lock styling anywhere.
// =============================================================================

const TILE_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 2,
  },
  tileActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
    // shadow-coloring-button: soft accent glow under the active tile.
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  tileInactive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.bgCreamDark,
  },
  tileDisabled: {
    opacity: 0.5,
  },
});

export default InputModeSelector;
