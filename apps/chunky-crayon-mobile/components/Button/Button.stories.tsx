import { View, Text, ScrollView, StyleSheet } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import Button from "./Button";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Mobile mirror of web's `Design System / Buttons` story
 * (apps/chunky-crayon-web/stories/design-system.stories.tsx). Layout,
 * section order, copy, and button labels match web 1:1 so the two
 * Storybooks read like-for-like. This is the shared chunky button —
 * the backbone of CC's look — replacing per-screen inline Pressables.
 *
 * Tap any button to feel the chunky press (lift collapses 6px→3px,
 * face translates down, light haptic + pop sound).
 */

const meta: Meta<typeof Button> = {
  title: "Design System/Button",
  component: Button,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Button>;

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
    <View style={styles.row}>{children}</View>
  </View>
);

export const Buttons: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buttons</Text>
        <Text style={styles.intro}>
          The app should use one shared Button API with clear roles. Primary
          CTAs should use the tactile deep style; quiet controls and links
          should stay visually lighter. The old glow CTA treatment has been
          removed so primary actions share the same tactile language.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommendation</Text>
        <Text style={styles.cardBody}>
          Standardise primary actions on the deep/tactile CTA. It matches the
          toast language, feels more like Chunky Crayon, and has a clearer press
          state than the glow-only treatment.
        </Text>
      </View>

      <Section
        title="1. Primary CTA"
        description="Use for the main action in a section or form: create, sign in, save, continue, buy, download."
      >
        <Button label="Default create" onPress={action("default-create")} />
        <Button label="Small size" size="sm" onPress={action("small")} />
        <Button label="Large size" size="lg" onPress={action("large")} />
        <Button label="Create" onPress={action("create")} />
        <Button label="Create disabled" disabled onPress={action("nope")} />
      </Section>

      <Section
        title="2. Quiet And Support Controls"
        description="Use when the action is secondary, reversible, or one of several choices in a dense form."
      >
        <Button
          label="Quiet outline"
          variant="outline-muted"
          onPress={action("quiet-outline")}
        />
        <Button label="Outline" variant="outline" onPress={action("outline")} />
        <Button label="Ghost" variant="ghost" onPress={action("ghost")} />
        <Button label="Neutral" variant="neutral" onPress={action("neutral")} />
      </Section>

      <Section
        title="3. Text Link"
        description="Use for low-emphasis navigation or helper actions. This is not a CTA shape."
      >
        <Button label="Link button" variant="link" onPress={action("link")} />
      </Section>

      <Section
        title="4. Status Actions"
        description="Use only when the button meaning is semantic: success, destructive, warning, or a similar state."
      >
        <Button label="Success" variant="success" onPress={action("success")} />
        <Button
          label="Destructive"
          variant="destructive"
          onPress={action("destructive")}
        />
        <Button
          label="Secondary highlight"
          variant="secondary"
          onPress={action("secondary")}
        />
      </Section>
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    gap: 32,
    backgroundColor: COLORS.bgCream,
    flexGrow: 1,
  },
  header: { gap: 8 },
  title: { fontFamily: FONTS.bold, fontSize: 34, color: COLORS.textPrimary },
  intro: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.textSecondary,
    lineHeight: 26,
    maxWidth: 720,
  },
  card: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
    padding: 20,
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  cardBody: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    maxWidth: 720,
  },
  section: {
    gap: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.bgCreamDark,
    paddingTop: 24,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    maxWidth: 720,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "center",
  },
});
