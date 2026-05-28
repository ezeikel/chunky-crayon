import { View, Text, ScrollView, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faWandMagicSparkles, faPlus } from "@fortawesome/pro-solid-svg-icons";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import Button, { type ButtonVariant } from "./Button";
import { FONTS } from "@/lib/design";

/**
 * Mobile mirror of web's `Design System / Buttons` story. This is the
 * shared chunky button — the backbone of CC's look. Replaces the
 * per-screen inline Pressables that had drifted.
 *
 * Variants + sizes match web's Button.tsx 1:1. Tap any button to feel
 * the chunky press (lift collapses 6px→3px, face translates down,
 * light haptic + pop sound).
 */

const VARIANTS: ButtonVariant[] = [
  "default",
  "secondary",
  "destructive",
  "success",
  "neutral",
  "outline",
  "outline-muted",
  "ghost",
  "link",
];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.row}>{children}</View>
  </View>
);

const meta: Meta<typeof Button> = {
  title: "Design System/Button",
  component: Button,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Button>;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
    backgroundColor: "#FAF7F0",
    flexGrow: 1,
  },
  header: { gap: 6 },
  title: { fontFamily: FONTS.bold, fontSize: 28, color: "#43342D" },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#72625A",
    lineHeight: 20,
  },
  section: { gap: 10 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: "#43342D" },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
});

export const AllVariants: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Button</Text>
        <Text style={styles.subtitle}>
          The shared chunky crayon button. Variants + sizes match web&apos;s
          Button.tsx. Press to feel the 6px→3px lift, haptic + pop.
        </Text>
      </View>

      <Section title="Variants">
        {VARIANTS.map((v) => (
          <Button
            key={v}
            label={v}
            variant={v}
            onPress={action(`press:${v}`)}
          />
        ))}
      </Section>

      <Section title="Sizes (default variant)">
        <Button label="Small" size="sm" onPress={action("sm")} />
        <Button label="Default" size="default" onPress={action("default")} />
        <Button label="Large" size="lg" onPress={action("lg")} />
        <Button
          size="icon"
          onPress={action("icon")}
          accessibilityLabel="add"
          leading={<FontAwesomeIcon icon={faPlus} size={20} color="#FFFFFF" />}
        />
      </Section>

      <Section title="With icons">
        <Button
          label="Auto color"
          variant="secondary"
          leading={
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              size={18}
              color="#FFFFFF"
            />
          }
          onPress={action("auto-color")}
        />
        <Button
          label="New page"
          leading={<FontAwesomeIcon icon={faPlus} size={18} color="#FFFFFF" />}
          onPress={action("new-page")}
        />
      </Section>

      <Section title="Disabled">
        <Button label="Disabled" disabled onPress={action("nope")} />
        <Button
          label="Disabled outline"
          variant="outline"
          disabled
          onPress={action("nope")}
        />
      </Section>
    </ScrollView>
  ),
};
