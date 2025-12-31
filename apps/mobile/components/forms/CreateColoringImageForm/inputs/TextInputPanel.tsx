import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useInputMode } from "./InputModeContext";
import Spinner from "@/components/Spinner/Spinner";

// =============================================================================
// Design Tokens (matching web tailwind config)
// =============================================================================

const COLORS = {
  // Primary - Coral: hsl(12, 75%, 58%)
  crayonOrange: "#E46444",
  // Background cream dark: hsl(35, 40%, 93%)
  bgCreamDark: "#F0E9E0",
  // Text primary: hsl(20, 20%, 22%)
  textPrimary: "#443832",
  // Text muted: hsl(20, 10%, 50%)
  textMuted: "#8B7E78",
  // White
  white: "#FFFFFF",
};

// =============================================================================
// Types
// =============================================================================

type TextInputPanelProps = {
  onSubmit: () => void;
  isSubmitting: boolean;
};

// =============================================================================
// Component
// =============================================================================

const TextInputPanel = ({ onSubmit, isSubmitting }: TextInputPanelProps) => {
  const { description, setDescription } = useInputMode();

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        onChangeText={setDescription}
        value={description}
        placeholder="e.g. a pirate ship sailing through space 🚀"
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
        editable={!isSubmitting}
      />

      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={isSubmitting || !description.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Creating..." : "Create coloring page"}
        </Text>
        {isSubmitting && <Spinner color={COLORS.white} size={18} />}
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  textInput: {
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    borderRadius: 12,
    minHeight: 144,
    padding: 16,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.crayonOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    // shadow-btn-primary: 0 4px 14px 0 hsl(var(--crayon-orange) / 0.4)
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: "TondoTrial-Bold",
  },
});

export default TextInputPanel;
