import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import Toaster, { toast } from "@/components/Toaster";
import { FONTS } from "@/lib/design";

/**
 * Mobile mirror of `apps/chunky-crayon-web/stories/design-system.stories.tsx`
 * → `ToastFeedback`. Lets us trigger each sonner-native variant from
 * Storybook so we can compare side-by-side with web's `/?path=/story/
 * chunky-crayon-design-system--toast-feedback`.
 *
 * Toaster host is mounted inside the story (not the preview decorator)
 * because the preview wraps every story — most don't need a toaster
 * and a global one would leak between unrelated stories.
 *
 * Each button mirrors the wording from the web design-system story
 * verbatim so the side-by-side comparison reads identically:
 *   - "Coloring page saved"           (success)
 *   - "Could not create that page"    (error)
 *   - "Drawing your page now"         (loading / default)
 *
 * Warning + info aren't in the web story; we add them here because
 * mobile uses both and we need to see the variants render correctly.
 */

const Btn = ({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: "success" | "error" | "warning" | "info" | "loading" | "default";
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.btn,
      styles[`btn_${variant}`],
      pressed && styles.btnPressed,
    ]}
    accessibilityLabel={`${variant} toast`}
  >
    <Text style={[styles.btnText, styles[`btnText_${variant}`]]}>{label}</Text>
  </Pressable>
);

const meta: Meta = {
  title: "Design System/Toaster",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const ToastFeedback: Story = {
  render: () => (
    <View style={styles.container}>
      <Toaster />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Toaster</Text>
          <Text style={styles.subtitle}>
            Brand-styled sonner-native variants. Pill cards (24px radius),
            chunky 6px hard-offset shadow in the variant's dark shade, duotone
            FA icon, blended close X. Matches web's
            packages/coloring-ui/src/Toaster.tsx.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Variants</Text>
          <Text style={styles.sectionUse}>
            Tap any button to fire the toast. All toasts auto-dismiss after 4s
            unless tapped on the close X.
          </Text>
          <View style={styles.row}>
            <Btn
              label="Success"
              variant="success"
              onPress={() => toast.success("Coloring page saved")}
            />
            <Btn
              label="Error"
              variant="error"
              onPress={() => toast.error("Could not create that page")}
            />
            <Btn
              label="Warning"
              variant="warning"
              onPress={() =>
                toast.warning("Almost out of credits", {
                  description: "Top up to keep creating",
                })
              }
            />
            <Btn
              label="Info"
              variant="info"
              onPress={() => toast.info("Language coming soon!")}
            />
            <Btn
              label="Loading"
              variant="loading"
              onPress={() => toast.loading("Drawing your page now")}
            />
            <Btn
              label="Default"
              variant="default"
              onPress={() => toast("Drawing your page now")}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>With description</Text>
          <Text style={styles.sectionUse}>
            Toasts can carry a secondary description line — rendered slightly
            smaller and at 0.9 opacity. Use sparingly; one-liners read faster.
          </Text>
          <View style={styles.row}>
            <Btn
              label="With description"
              variant="success"
              onPress={() =>
                toast.success("Saved to your collection!", {
                  description: "Look at you go",
                })
              }
            />
            <Btn
              label="Long body"
              variant="error"
              onPress={() =>
                toast.error("Couldn't save your artwork", {
                  description:
                    "Something went wrong on our side. Try again in a moment.",
                })
              }
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stacking</Text>
          <Text style={styles.sectionUse}>
            Fire several at once — they stack with 28px gap, matching web's
            `gap={28}`. Stack is capped at 3 visible (`visibleToasts={3}`).
          </Text>
          <View style={styles.row}>
            <Btn
              label="Fire 4 in a row"
              variant="info"
              onPress={() => {
                toast.success("Coloring page saved");
                toast.error("Could not create that page");
                toast.warning("Almost out of credits");
                toast.info("Language coming soon!");
              }}
            />
            <Btn
              label="Dismiss all"
              variant="default"
              onPress={() => toast.dismiss()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFAF5" },
  scroll: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 8 },
  title: { fontFamily: FONTS.bold, fontSize: 28, color: "#3D2C1E" },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#6B5344",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#F5EDE6",
  },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: "#3D2C1E" },
  sectionUse: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#6B5344",
    lineHeight: 18,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  btnText: { fontFamily: FONTS.bold, fontSize: 14 },

  btn_success: { backgroundColor: "#8CAF5A" },
  btnText_success: { color: "#FFFFFF" },
  btn_error: { backgroundColor: "#E68991" },
  btnText_error: { color: "#FFFFFF" },
  btn_warning: { backgroundColor: "#E9A60C" },
  btnText_warning: { color: "#FFFFFF" },
  btn_info: { backgroundColor: "#5A9EE2" },
  btnText_info: { color: "#FFFFFF" },
  btn_loading: { backgroundColor: "#C18B9D" },
  btnText_loading: { color: "#FFFFFF" },
  btn_default: { backgroundColor: "#F3EBE0" },
  btnText_default: { color: "#7A6F66" },
});
