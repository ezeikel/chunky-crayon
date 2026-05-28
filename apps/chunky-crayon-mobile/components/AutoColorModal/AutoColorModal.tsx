import { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Button from "@/components/Button";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Auto-Color modal — mobile port of coloring-ui's AutoColorModal +
 * AutoColorPreview, combined into one full-screen blocking modal with
 * two states (per the native form-factor doc: auto-color is a blocking
 * flow → full-screen RN Modal, like ParentalGate).
 *
 *   state="loading" → spinner + "Coloring your picture!" while the AI
 *     paints. Blocks all interaction.
 *   state="preview" → the AI-colored reference image with Cancel / Try
 *     Again / "Yes! Color it!" — the kid judges the colours before they
 *     get applied to the canvas (web's AutoColorPreview).
 *
 * Presentational + controlled: the parent owns the AI pipeline (generate
 * → reference → apply) and drives `state` + the callbacks. Kept prop-
 * driven because the mobile auto-color backend (region store / AI
 * reference) isn't wired yet — this is the UI, ready to connect.
 */

export type AutoColorModalState = "loading" | "preview";

type AutoColorModalProps = {
  visible: boolean;
  state: AutoColorModalState;
  /**
   * The AI-colored reference (preview state only). Production passes a
   * base64 / URL string; Storybook can pass a bundled `require()` asset.
   */
  referenceImage?: string | ImageSourcePropType | null;
  /** Apply the previewed colours to the canvas. */
  onApply?: () => void;
  /** Generate a different colouring. */
  onRetry?: () => void;
  /** Cancel auto-color entirely. */
  onCancel?: () => void;
  /** A retry generation is in flight (shows the Try Again spinner). */
  isRetrying?: boolean;
};

// Reanimated spinning ring — the loading spinner. `small` for the
// inline Try-Again button state.
const SpinningRing = ({ small = false }: { small?: boolean }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return <Animated.View style={[small ? styles.ringSmall : styles.ring, style]} />;
};

const AutoColorModal = ({
  visible,
  state,
  referenceImage,
  onApply,
  onRetry,
  onCancel,
  isRetrying = false,
}: AutoColorModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={state === "preview" ? onCancel : undefined}
    >
      <View style={styles.backdrop}>
        {state === "loading" ? (
          <View style={styles.loadingCard}>
            <SpinningRing />
            <View style={styles.loadingText}>
              <Text style={styles.title}>Coloring your picture!</Text>
              <Text style={styles.subtitle}>
                Hang tight, the magic is happening
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Look at these colors! 🎨</Text>
            <Text style={styles.subtitle}>Do you like how this looks?</Text>

            <View style={styles.previewImageWrap}>
              {referenceImage ? (
                <Image
                  source={
                    typeof referenceImage === "string"
                      ? { uri: referenceImage }
                      : referenceImage
                  }
                  style={styles.previewImage}
                  contentFit="contain"
                  transition={200}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <SpinningRing />
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                variant="outline-muted"
                size="default"
                label="Cancel"
                onPress={onCancel}
                disabled={isRetrying}
                style={styles.actionBtn}
              />
              <Button
                variant="secondary"
                size="default"
                label={isRetrying ? "Generating…" : "Try Again"}
                leading={isRetrying ? <SpinningRing small /> : undefined}
                onPress={onRetry}
                disabled={isRetrying}
                style={styles.actionBtn}
              />
              <Button
                variant="success"
                size="default"
                label="Yes! Color it! 🎉"
                onPress={onApply}
                disabled={isRetrying}
                style={styles.actionBtn}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 16,
  },
  // ── loading ──
  loadingCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 20,
    padding: 32,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: COLORS.crayonOrangeLight,
    borderTopColor: COLORS.crayonOrange,
  },
  ringSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderTopColor: "#FFFFFF",
  },
  loadingText: {
    alignItems: "center",
    gap: 6,
  },
  // ── preview ──
  previewCard: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  previewImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.bgCream,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
  // ── text ──
  title: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  previewTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.crayonOrange,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});

export default AutoColorModal;
