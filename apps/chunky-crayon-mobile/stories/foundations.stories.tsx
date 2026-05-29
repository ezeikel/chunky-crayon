import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import {
  RADIUS,
  SPACING,
  SHADOWS,
  FONT_SIZES,
  FONTS,
  COLORS,
  CRAYON_PALETTE,
  type ShadowKey,
  type RadiusKey,
} from "@/lib/design";

/**
 * Mobile-side mirror of web's "Design System / Foundations" story.
 *
 * The non-colour primitives that everything else is built from: corner
 * radii, the spacing scale, elevation/shadow presets, and the type
 * scale. Tokens live in `lib/design/{spacing,shadows,typography}.ts`.
 * This is a visual contract — touch a token here and every screen
 * shifts, so the story makes the current values legible at a glance.
 */

const RADIUS_ROWS: RadiusKey[] = ["sm", "md", "lg", "xl", "2xl", "3xl", "full"];
const SHADOW_ROWS: ShadowKey[] = ["sm", "md", "lg", "xl", "2xl", "warm"];
// A readable slice of the 4px spacing scale (not all 23 steps).
const SPACING_ROWS = [1, 2, 3, 4, 6, 8, 12, 16] as const;
const TYPE_ROWS: { key: keyof typeof FONT_SIZES; label: string }[] = [
  { key: "5xl", label: "Display" },
  { key: "4xl", label: "H1" },
  { key: "3xl", label: "H2" },
  { key: "2xl", label: "H3" },
  { key: "xl", label: "H4" },
  { key: "base", label: "Body" },
  { key: "sm", label: "Label" },
  { key: "xs", label: "Caption" },
];

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const Foundations = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>Foundations</Text>
      <Text style={styles.subtitle}>
        The non-colour primitives from `lib/design`: radii, spacing, shadows,
        and the type scale. These are the contract every component reuses.
      </Text>
    </View>

    {/* Radius */}
    <SectionTitle>Corner radius</SectionTitle>
    <View style={styles.card}>
      {RADIUS_ROWS.map((key) => (
        <View key={key} style={styles.row}>
          <View
            style={[
              styles.radiusSwatch,
              { borderRadius: Math.min(RADIUS[key], 40) },
            ]}
          />
          <View style={styles.rowMeta}>
            <Text style={styles.rowKey}>{key}</Text>
            <Text style={styles.rowVal}>{RADIUS[key]}px</Text>
          </View>
        </View>
      ))}
    </View>

    {/* Spacing */}
    <SectionTitle>Spacing scale (4px base)</SectionTitle>
    <View style={styles.card}>
      {SPACING_ROWS.map((step) => (
        <View key={step} style={styles.row}>
          <View style={[styles.spacingBar, { width: SPACING[step] }]} />
          <View style={styles.rowMeta}>
            <Text style={styles.rowKey}>{step}</Text>
            <Text style={styles.rowVal}>{SPACING[step]}px</Text>
          </View>
        </View>
      ))}
    </View>

    {/* Shadows */}
    <SectionTitle>Elevation</SectionTitle>
    <View style={styles.shadowGrid}>
      {SHADOW_ROWS.map((key) => (
        <View key={key} style={[styles.shadowTile, SHADOWS[key]]}>
          <Text style={styles.shadowLabel}>{key}</Text>
        </View>
      ))}
    </View>

    {/* Type scale */}
    <SectionTitle>Type scale (Tondo)</SectionTitle>
    <View style={styles.card}>
      {TYPE_ROWS.map(({ key, label }) => (
        <View key={key} style={styles.typeRow}>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: FONT_SIZES[key],
              color: COLORS.textPrimary,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text style={styles.rowVal}>{FONT_SIZES[key]}px</Text>
        </View>
      ))}
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: COLORS.bgCream, flexGrow: 1 },
  header: { marginBottom: 24 },
  title: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.textPrimary },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    gap: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  rowMeta: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  rowKey: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.textPrimary },
  rowVal: { fontFamily: "Menlo", fontSize: 12, color: COLORS.textMuted },
  radiusSwatch: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.crayonOrange,
  },
  spacingBar: {
    height: 16,
    minWidth: 4,
    borderRadius: 4,
    backgroundColor: CRAYON_PALETTE.purple,
  },
  shadowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  shadowTile: {
    width: "29%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shadowLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
});

const meta: Meta = {
  title: "Design System/Foundations",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Tokens: Story = { render: () => <Foundations /> };
