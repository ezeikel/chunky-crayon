import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import * as Haptics from "expo-haptics";
import { useInputMode, type InputMode } from "./InputModeContext";

// =============================================================================
// Design Tokens (matching web tailwind config)
// =============================================================================

const COLORS = {
  // Primary - Coral: hsl(12, 75%, 58%)
  crayonOrange: "#E46444",
  // Secondary - Peach: hsl(25, 80%, 72%) - web calls this "teal"
  crayonPeach: "#F1AE7E",
  // Background cream dark: hsl(35, 40%, 93%)
  bgCreamDark: "#F0E9E0",
  // Text primary: hsl(20, 20%, 22%)
  textPrimary: "#443832",
  // White
  white: "#FFFFFF",
};

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
  label: string;
  icon: IconDefinition;
};

// =============================================================================
// Constants
// =============================================================================

const INPUT_OPTIONS: InputOption[] = [
  {
    mode: "text",
    label: "Type",
    icon: faPencil,
  },
  {
    mode: "voice",
    label: "Talk",
    icon: faMicrophoneLines,
  },
  {
    mode: "image",
    label: "Photo",
    icon: faCameraRetro,
  },
];

// =============================================================================
// Component
// =============================================================================

type InputModeSelectorProps = {
  /** Disable all mode buttons */
  disabled?: boolean;
};

const InputModeSelector = ({ disabled }: InputModeSelectorProps) => {
  const { mode: currentMode, setMode, isProcessing } = useInputMode();

  const handleModeChange = async (mode: InputMode) => {
    if (disabled || isProcessing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode);
  };

  return (
    <View style={styles.container}>
      {INPUT_OPTIONS.map((option) => {
        const isActive = option.mode === currentMode;
        const isDisabled = disabled || isProcessing;

        return (
          <TouchableOpacity
            key={option.mode}
            onPress={() => handleModeChange(option.mode)}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              isDisabled && styles.buttonDisabled,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${option.label} input mode`}
          >
            <FontAwesomeIcon
              icon={option.icon}
              size={24}
              color={isActive ? COLORS.white : COLORS.crayonOrange}
              secondaryColor={
                isActive ? "rgba(255, 255, 255, 0.8)" : COLORS.crayonPeach
              }
              secondaryOpacity={1}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  buttonActive: {
    backgroundColor: COLORS.crayonOrange,
    borderColor: COLORS.crayonOrange,
    // shadow-btn-primary: 0 4px 14px 0 hsl(var(--crayon-orange) / 0.4)
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
  },
  labelActive: {
    color: COLORS.white,
  },
});

export default InputModeSelector;
