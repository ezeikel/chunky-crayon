import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { COLORS, CRAYON_PALETTE, COLO_STAGE_COLORS } from "@/lib/design";

/**
 * Mobile-side mirror of web's "Design System / Colors" story.
 *
 * Web ships tokens as Tailwind classes built from HSL variables in
 * global.css. Mobile ships them as hex literals in
 * `lib/design/colors.ts`. The tokens don't match web 1:1 (mobile's
 * crayon palette uses brighter saturations because RN's lack of
 * background-blend means the colours have to carry the visual punch
 * on their own). This story exists so anyone touching mobile colour
 * work can see what's actually in the palette.
 *
 * Layout mirrors web's card-of-stacked-swatches pattern:
 *   - Each colour family gets one card
 *   - Card top: stacked swatches with the colour name on each
 *   - Card body: family name + use description
 *   - Card foot: hex value list
 */

type Swatch = {
  label: string;
  hex: string;
};

type Family = {
  family: string;
  use: string;
  swatches: Swatch[];
};

const FAMILIES: Family[] = [
  {
    family: "Crayon (brand)",
    use: "Primary actions, CTAs, brand surfaces. CC's defining warmth.",
    swatches: [
      { label: "Crayon Orange", hex: CRAYON_PALETTE.orange },
      { label: "Primary Light", hex: COLORS.primaryLight },
      { label: "Primary Dark", hex: COLORS.primaryDark },
      { label: "Secondary", hex: COLORS.secondaryOrange },
    ],
  },
  {
    family: "Crayon palette",
    use: "Drawing tools, fills, and accent badges. Kid-readable.",
    swatches: [
      { label: "Red", hex: CRAYON_PALETTE.red },
      { label: "Orange", hex: CRAYON_PALETTE.orange },
      { label: "Yellow", hex: CRAYON_PALETTE.yellow },
      { label: "Green", hex: CRAYON_PALETTE.green },
      { label: "Blue", hex: CRAYON_PALETTE.blue },
      { label: "Purple", hex: CRAYON_PALETTE.purple },
      { label: "Pink", hex: CRAYON_PALETTE.pink },
      { label: "Brown", hex: CRAYON_PALETTE.brown },
    ],
  },
  {
    family: "Backgrounds",
    use: "Warm paper feel. Use bgCanvas for the coloring surface itself.",
    swatches: [
      { label: "Cream", hex: COLORS.bgCream },
      { label: "Peach", hex: COLORS.bgPeach },
      { label: "Canvas", hex: COLORS.bgCanvas },
    ],
  },
  {
    family: "Text",
    use: "Body copy, captions, secondary labels.",
    swatches: [
      { label: "Primary", hex: COLORS.textPrimary },
      { label: "Secondary", hex: COLORS.textSecondary },
      { label: "Muted", hex: COLORS.textMuted },
      { label: "Warm muted", hex: COLORS.textWarmMuted },
    ],
  },
  {
    family: "State",
    use: "Success / warning / error / info feedback.",
    swatches: [
      { label: "Success", hex: COLORS.success },
      { label: "Warning", hex: COLORS.warning },
      { label: "Error", hex: COLORS.error },
      { label: "Info", hex: COLORS.info },
    ],
  },
  {
    family: "Borders",
    use: "Dividers + card edges; keeping the warm-on-warm separation soft.",
    swatches: [
      { label: "Border", hex: COLORS.border },
      { label: "Border Light", hex: COLORS.borderLight },
    ],
  },
];

const COLO_STAGE_FAMILIES: Family[] = [1, 2, 3, 4, 5, 6].map((stage) => ({
  family: `Colo stage ${stage}`,
  use:
    stage === 1
      ? "Hatchling — warm yellow start"
      : stage === 2
        ? "Sprout — green growth"
        : stage === 3
          ? "Curious — sky blue"
          : stage === 4
            ? "Explorer — joyful pink"
            : stage === 5
              ? "Artist — creative violet"
              : "Master — golden",
  swatches: [
    {
      label: "From",
      hex: COLO_STAGE_COLORS[stage as 1 | 2 | 3 | 4 | 5 | 6].from,
    },
    {
      label: "To",
      hex: COLO_STAGE_COLORS[stage as 1 | 2 | 3 | 4 | 5 | 6].to,
    },
  ],
}));

const FamilyCard = ({ family }: { family: Family }) => (
  <View style={styles.card}>
    <View style={styles.swatchStack}>
      {family.swatches.map((s) => (
        <View key={s.label} style={[styles.swatch, { backgroundColor: s.hex }]}>
          <View style={styles.swatchLabelPill}>
            <Text style={styles.swatchLabelText}>{s.label}</Text>
          </View>
        </View>
      ))}
    </View>
    <Text style={styles.familyName}>{family.family}</Text>
    <Text style={styles.familyUse}>{family.use}</Text>
    <View style={styles.hexBlock}>
      {family.swatches.map((s) => (
        <Text key={s.label} style={styles.hexText}>
          {s.hex}
        </Text>
      ))}
    </View>
  </View>
);

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
    fontFamily: "TondoTrial-Bold",
    fontSize: 32,
    color: "#3D2C1E",
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#6B5344",
    marginTop: 8,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#3D2C1E",
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E8DFD6",
    padding: 12,
    marginBottom: 16,
  },
  swatchStack: {
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD6",
  },
  swatch: {
    height: 56,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  swatchLabelPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  swatchLabelText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: "#3D2C1E",
  },
  familyName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#3D2C1E",
    marginTop: 12,
  },
  familyUse: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B5344",
    marginTop: 4,
    lineHeight: 18,
  },
  hexBlock: {
    backgroundColor: "#FFF5EB",
    borderRadius: 14,
    padding: 10,
    marginTop: 12,
  },
  hexText: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: "#6B5344",
    lineHeight: 16,
  },
});

const meta: Meta = {
  title: "Design System/Colors",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Color Palette</Text>
        <Text style={styles.subtitle}>
          Mobile's design tokens from `lib/design/colors.ts`. The crayon palette
          carries most UI work; background + text tokens support layout chrome;
          state tokens are reserved for feedback. Hex values shown beneath each
          card.
        </Text>
      </View>

      {FAMILIES.map((f) => (
        <FamilyCard key={f.family} family={f} />
      ))}

      <Text style={styles.sectionTitle}>Colo evolution stages</Text>
      {COLO_STAGE_FAMILIES.map((f) => (
        <FamilyCard key={f.family} family={f} />
      ))}
    </ScrollView>
  ),
};
