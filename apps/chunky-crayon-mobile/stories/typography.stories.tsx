import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FONTS, FONT_SIZES, TEXT_STYLES, LINE_HEIGHTS } from "@/lib/design";

/**
 * Mobile-side mirror of web's "Design System / Typography" story.
 *
 * Mobile uses the TondoTrial family (bundled in assets/fonts/),
 * mapped to semantic FONTS keys (light/regular/medium/semiBold/bold).
 * `TEXT_STYLES` are the pre-composed (font + size + lineHeight)
 * recipes the rest of the app consumes via `<Text style={TEXT_STYLES.h1}>`.
 *
 * Three blocks:
 *   1. Sample paragraph — see Tondo in the wild
 *   2. Font sizes (xs → 5xl) — visual scale
 *   3. TEXT_STYLES — every pre-composed recipe with its key name
 */

const SAMPLE_TEXT = "The chunky brown fox draws over the lazy dog.";

const meta: Meta = {
  title: "Design System/Typography",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

export const Tondo: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Typography</Text>
        <Text style={styles.subtitle}>
          CC mobile's voice is the TondoTrial family — chunky, friendly,
          parent-readable. RooneySans is also bundled (used by the legacy
          onboarding strings) but Tondo is the default voice.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Font family weights</Text>
      <View style={styles.card}>
        {(["light", "regular", "medium", "semiBold", "bold"] as const).map(
          (key) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{key}</Text>
              <Text
                style={{
                  fontFamily: FONTS[key],
                  fontSize: 18,
                  color: "#3D2C1E",
                  flexShrink: 1,
                }}
              >
                {SAMPLE_TEXT}
              </Text>
            </View>
          ),
        )}
      </View>

      <Text style={styles.sectionTitle}>Font sizes</Text>
      <View style={styles.card}>
        {(Object.keys(FONT_SIZES) as Array<keyof typeof FONT_SIZES>).map(
          (key) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>
                {key} · {FONT_SIZES[key]}px
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.regular,
                  fontSize: FONT_SIZES[key],
                  lineHeight: FONT_SIZES[key] * LINE_HEIGHTS.normal,
                  color: "#3D2C1E",
                  flexShrink: 1,
                }}
              >
                Aa Bb
              </Text>
            </View>
          ),
        )}
      </View>

      <Text style={styles.sectionTitle}>Pre-composed text styles</Text>
      <Text style={styles.sectionSubtitle}>
        These are the recipes the app uses. Apply via
        {" `<Text style={TEXT_STYLES.h1}>...</Text>` "} for h1, etc.
      </Text>
      <View style={styles.card}>
        {(Object.keys(TEXT_STYLES) as Array<keyof typeof TEXT_STYLES>).map(
          (key) => (
            <View key={key} style={styles.recipeRow}>
              <Text style={styles.rowLabel}>{key}</Text>
              <Text style={[TEXT_STYLES[key], { color: "#3D2C1E" }]}>
                The chunky brown fox draws.
              </Text>
            </View>
          ),
        )}
      </View>
    </ScrollView>
  ),
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#FFFDF5",
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
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
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: "#3D2C1E",
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#6B5344",
    marginBottom: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E8DFD6",
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  recipeRow: {
    gap: 4,
    paddingVertical: 6,
  },
  rowLabel: {
    fontFamily: "Menlo",
    fontSize: 12,
    color: "#8B7E78",
    width: 110,
  },
});
