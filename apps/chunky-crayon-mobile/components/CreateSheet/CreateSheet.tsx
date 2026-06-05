import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSparkles } from "@fortawesome/pro-duotone-svg-icons";
import CreateColoringImageForm from "@/components/forms/CreateColoringImageForm/CreateColoringImageForm";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS, SHEET_HANDLE } from "@/lib/design";

type CreateSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Create bottom sheet — the app's primary action, opened by the centre tab-bar
 * FAB. Uses @swmansion/react-native-bottom-sheet (same as ColoBottomSheet /
 * ActionSheet / ConfirmSheet) so it shares the app's sheet language: a grab
 * handle, the cream surface, swipe / scrim-tap to dismiss — NO redundant X.
 *
 * Was previously a native expo-router `presentation:"modal"` screen, which gave
 * a system grabber + a tall top gap and didn't match the in-app sheets.
 *
 * Hosts the same shared CreateColoringImageForm the Home tab embeds inline; a
 * warm sparkly greeting sits above it so the sheet doesn't read as a bare form.
 */
const CreateSheet = ({ isOpen, onClose }: CreateSheetProps) => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile");

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  // Only mount while open — a ModalBottomSheet at index 0 stays mounted-but-
  // collapsed and peeks above the bottom edge. (Matches ActionSheet.)
  if (!isOpen) return null;

  return (
    <ModalBottomSheet
      index={1}
      onIndexChange={handleIndexChange}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handleIndicator} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Warm, playful header (mirrors the Home create section). */}
          <View style={styles.greetingRow}>
            <FontAwesomeIcon
              icon={faSparkles}
              size={22}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.secondaryOrange}
              secondaryOpacity={1}
            />
            <Text style={styles.greeting}>{t("create.greeting")}</Text>
            <FontAwesomeIcon
              icon={faSparkles}
              size={22}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.secondaryOrange}
              secondaryOpacity={1}
            />
          </View>
          <Text style={styles.subtitle}>{t("create.subtitle")}</Text>

          {/* Bordered white card — same as web's CreateColoringPageForm + the
              Home tab's inline create card. */}
          <View style={styles.card}>
            <CreateColoringImageForm />
          </View>
        </ScrollView>
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: COLORS.bgCream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  // Shared canonical sheet handle (matches the coloring drawer + all sheets).
  handleIndicator: {
    ...SHEET_HANDLE,
    marginBottom: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});

export default CreateSheet;
