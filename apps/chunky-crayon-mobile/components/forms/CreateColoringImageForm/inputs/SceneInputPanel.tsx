import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONTS } from "@/lib/design";

/**
 * PLACEHOLDER scene panel.
 *
 * Scene Builder is the privacy-first DEFAULT create mode. The full 5-layer
 * wizard (subject / location / weather / activity / accent → deterministic
 * prompt) lands in M2 slice 4 (the RN SceneBuilder) + slice 5 (this adapter
 * wired to `setDescription`). For now this renders a stub so the default
 * mode is functional and the form compiles; it does NOT yet drive a real
 * submission.
 */

type SceneInputPanelProps = {
  onSubmit: () => void;
  isSubmitting: boolean;
};

const SceneInputPanel = (_props: SceneInputPanelProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>Build a scene</Text>
    <Text style={styles.subtitle}>
      Tap to pick a subject, place, and more. Coming together soon!
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    opacity: 0.7,
    textAlign: "center",
  },
});

export default SceneInputPanel;
