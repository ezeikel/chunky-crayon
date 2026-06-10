import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faShapes,
  faPencil,
  faMicrophoneLines,
  faCameraRetro,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { toast } from "sonner-native";
import { COLORS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import Button from "@/components/Button/Button";
import ParentalGate from "@/components/ParentalGate";
import { useUnlockedModes } from "@/hooks/api";
import { isGateableMode, type GateableMode } from "@/lib/scene/modes";
import { useT } from "@/lib/i18n/useT";
import { useInputMode, type InputMode } from "./InputModeContext";

// =============================================================================
// Types
// =============================================================================

type InputOption = {
  mode: InputMode;
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
  { mode: "scene", icon: faShapes, gateable: false },
  { mode: "text", icon: faPencil, gateable: true },
  { mode: "voice", icon: faMicrophoneLines, gateable: true },
  { mode: "image", icon: faCameraRetro, gateable: true },
];

// =============================================================================
// Tile
// =============================================================================

type TileProps = {
  option: InputOption;
  accessibilityLabel: string;
  isActive: boolean;
  isDisabled: boolean;
  onPress: () => void;
};

// Use the shared chunky <Button> so the mode tiles match web 1:1: active =
// `default` (orange face + chunky bottom lift), inactive = `outline-muted`
// (white face, cream border, flat). Web's InputModeSelector does exactly this
// — variant default/outline-muted on the same shared Button. A `size-16` (64pt)
// square holding the duotone icon, no label.
const InputModeTile = ({
  option,
  accessibilityLabel,
  isActive,
  isDisabled,
  onPress,
}: TileProps) => (
  <Button
    variant={isActive ? "default" : "outline-muted"}
    size="icon"
    disabled={isDisabled}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    faceStyle={styles.tile}
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
  </Button>
);

// =============================================================================
// Selector
// =============================================================================

type InputModeSelectorProps = {
  /** Disable all mode buttons */
  disabled?: boolean;
};

const InputModeSelector = ({ disabled }: InputModeSelectorProps) => {
  const t = useT("createForm.mode");
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
      track(ANALYTICS_EVENTS.INPUT_MODE_CHANGED, {
        from: currentMode,
        to: option.mode,
      });
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
      toast.error(t("unlockSaveFailed"));
    }
    track(ANALYTICS_EVENTS.INPUT_MODE_CHANGED, {
      from: currentMode,
      to: mode,
    });
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
            accessibilityLabel={t("a11yLabel", { mode: t(option.mode) })}
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
// Styles — the tile is a shared <Button size="icon">, overridden to a 64pt
// square (web's `size-16`). Face colours, border, and chunky lift all come
// from the Button variant (default / outline-muted); nothing styled here.
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
  },
});

export default InputModeSelector;
