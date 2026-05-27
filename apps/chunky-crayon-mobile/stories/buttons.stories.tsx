import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPalette,
  faWandMagicSparkles,
  faXmark,
  faPlus,
  faShare,
} from "@fortawesome/pro-solid-svg-icons";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FONTS } from "@/lib/design";

/**
 * Mobile-side mirror of web's "Design System / Buttons" story.
 *
 * Mobile doesn't have a single Button component — most "buttons" are
 * inline Pressables shaped by their context (chunky pill primary,
 * tinted secondary, icon-only round, cancel ghost). This story
 * documents the canonical patterns so anyone touching button work
 * knows what shape + tap target + style to reach for.
 *
 * Audience-aware UI rule (see memory feedback_audience_aware_ui):
 *   - CC (kids/parents): chunky pill buttons, ≥44pt taps, playful
 *     copy. Coral primary, cream tinted secondary, white background
 *     with thin border for tertiary.
 *   - CH (adults): refined chrome, thinner borders, narrower paddings.
 *     This story is CC; CH would do its own variant.
 *
 * All buttons here use the same haptic + active:scale-95 pattern in
 * production — we omit the haptic wiring in the story so taps don't
 * compete with Storybook's controls panel.
 */

const Primary = ({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: typeof faPalette;
  onPress?: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      buttonStyles.primary,
      pressed && buttonStyles.pressed,
    ]}
    onPress={onPress}
    accessibilityLabel={label}
  >
    {icon ? <FontAwesomeIcon icon={icon} size={18} color="#FFFFFF" /> : null}
    <Text style={buttonStyles.primaryText}>{label}</Text>
  </Pressable>
);

const Secondary = ({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      buttonStyles.secondary,
      pressed && buttonStyles.pressed,
    ]}
    onPress={onPress}
    accessibilityLabel={label}
  >
    <Text style={buttonStyles.secondaryText}>{label}</Text>
  </Pressable>
);

const Tertiary = ({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      buttonStyles.tertiary,
      pressed && buttonStyles.pressed,
    ]}
    onPress={onPress}
    accessibilityLabel={label}
  >
    <Text style={buttonStyles.tertiaryText}>{label}</Text>
  </Pressable>
);

const IconRound = ({
  icon,
  onPress,
  variant = "primary",
}: {
  icon: typeof faPalette;
  onPress?: () => void;
  variant?: "primary" | "neutral";
}) => (
  <Pressable
    style={({ pressed }) => [
      buttonStyles.iconRound,
      variant === "primary"
        ? buttonStyles.iconRoundPrimary
        : buttonStyles.iconRoundNeutral,
      pressed && buttonStyles.pressed,
    ]}
    onPress={onPress}
  >
    <FontAwesomeIcon
      icon={icon}
      size={20}
      color={variant === "primary" ? "#FFFFFF" : "#7A6F66"}
    />
  </Pressable>
);

const buttonStyles = StyleSheet.create({
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E46444",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minHeight: 48,
  },
  primaryText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EA",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minHeight: 48,
    borderWidth: 2,
    borderColor: "#E46444",
  },
  secondaryText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#E46444",
  },
  tertiary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EBE0",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minHeight: 48,
  },
  tertiaryText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#7A6F66",
  },
  iconRound: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRoundPrimary: {
    backgroundColor: "#E46444",
  },
  iconRoundNeutral: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E8DFD6",
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#FFFDF5",
    flexGrow: 1,
    gap: 24,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: "#3D2C1E",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: "#6B5344",
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E8DFD6",
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#3D2C1E",
  },
  sectionUse: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#6B5344",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});

const meta: Meta = {
  title: "Design System/Buttons",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

export const Gallery: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buttons</Text>
        <Text style={styles.subtitle}>
          CC mobile's canonical button shapes. Chunky pills, ≥44pt tap targets,
          audience-friendly. Web has a Button component; mobile uses inline
          Pressables shaped by these patterns.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Primary</Text>
        <Text style={styles.sectionUse}>
          The single most important action on the screen. Coral fill, white
          text, optional leading icon. Reserved for one button per surface.
        </Text>
        <View style={styles.row}>
          <Primary label="Save artwork" onPress={action("primary")} />
          <Primary
            label="Create"
            icon={faPalette}
            onPress={action("primary-with-icon")}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Secondary</Text>
        <Text style={styles.sectionUse}>
          Alternate path next to the primary. Tinted-cream fill, coral outline +
          text. Use when there's a real choice (e.g. "Save" vs "Share later").
        </Text>
        <View style={styles.row}>
          <Secondary label="Share later" onPress={action("secondary")} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tertiary / Cancel</Text>
        <Text style={styles.sectionUse}>
          Quiet path — typically "Cancel" paired with a primary "Confirm".
          Warm-grey fill, muted text. Never coral.
        </Text>
        <View style={styles.row}>
          <Tertiary label="Cancel" onPress={action("tertiary")} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Icon-only round</Text>
        <Text style={styles.sectionUse}>
          48×48 round button for FAB-style actions (close, add, share). Primary
          uses coral fill; neutral uses white + thin border.
        </Text>
        <View style={styles.row}>
          <IconRound icon={faPlus} onPress={action("icon-primary")} />
          <IconRound
            icon={faXmark}
            variant="neutral"
            onPress={action("icon-neutral-close")}
          />
          <IconRound
            icon={faShare}
            variant="neutral"
            onPress={action("icon-neutral-share")}
          />
          <IconRound
            icon={faWandMagicSparkles}
            onPress={action("icon-magic")}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stacked pair (modal footer)</Text>
        <Text style={styles.sectionUse}>
          Common in modals + the CreateProfile card. Tertiary cancel + flex-2
          primary so the primary visually dominates without eating all the
          width.
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Tertiary label="Cancel" onPress={action("pair-cancel")} />
          </View>
          <View style={{ flex: 2 }}>
            <Primary label="Save changes" onPress={action("pair-primary")} />
          </View>
        </View>
      </View>
    </ScrollView>
  ),
};
