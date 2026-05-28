import { View, TextInput, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faWandMagicSparkles } from "@fortawesome/pro-duotone-svg-icons";
import { useInputMode } from "./InputModeContext";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner/Spinner";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

type TextInputPanelProps = {
  onSubmit: () => void;
  isSubmitting: boolean;
};

const TextInputPanel = ({ onSubmit, isSubmitting }: TextInputPanelProps) => {
  const { description, setDescription } = useInputMode();
  const t = useT("mobile.button");

  const disabled = isSubmitting || !description.trim();

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

      {/* Shared chunky Button — the canonical create CTA (web uses the
          shared Button with a wand icon for this exact action). */}
      <Button
        variant="default"
        size="lg"
        fullWidth
        disabled={disabled}
        onPress={onSubmit}
        accessibilityLabel={t("createColoringPage")}
        leading={
          isSubmitting ? (
            <Spinner color="#FFFFFF" size={18} />
          ) : (
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              size={18}
              color="#FFFFFF"
              secondaryColor="rgba(255,255,255,0.85)"
              secondaryOpacity={1}
            />
          )
        }
        label={isSubmitting ? t("creating") : t("createColoringPage")}
      />
    </View>
  );
};

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
    fontFamily: FONTS.regular,
    fontSize: 16,
    textAlignVertical: "top",
  },
});

export default TextInputPanel;
