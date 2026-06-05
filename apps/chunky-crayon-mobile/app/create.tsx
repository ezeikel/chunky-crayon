import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";
import CreateColoringImageForm from "@/components/forms/CreateColoringImageForm/CreateColoringImageForm";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Create modal — the app's primary action, launched by the elevated
 * center FAB in the tab bar. Hosts the shared CreateColoringImageForm
 * full-screen (the same form Home embeds inline). On a successful
 * create the form pushes /coloring-image/[id] itself; the kid taps the
 * X to back out without creating.
 */
const CreateModal = () => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile");

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>{t("tabs.create")}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closePressed,
            ]}
            onPress={() => router.back()}
            accessibilityLabel={t("button.cancel")}
            hitSlop={8}
          >
            <FontAwesomeIcon
              icon={faXmark}
              size={20}
              color={COLORS.textMuted}
            />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Same bordered white card as web's CreateColoringPageForm (and the
              Home tab's inline create card) so both create surfaces match. */}
          <View style={styles.card}>
            <CreateColoringImageForm />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: {
    opacity: 0.6,
  },
  content: {
    paddingHorizontal: 16,
  },
  // Matches web's CreateColoringPageForm card + the Home tab's create card:
  // bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark p-6.
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

export default CreateModal;
