import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import PaletteVariantPills from "./PaletteVariantPills";
import {
  PALETTE_VARIANT_LABELS,
  type PaletteVariant,
} from "@/lib/coloring/palette";

/**
 * Palette-variant picker, mirroring CC web's variant pills. Four
 * icon-only pills (realistic / pastel / cute / surprise); the selected
 * one is solid orange with a white icon, the rest are white with a cream
 * border. Selecting a variant drives both the swatch grid and the
 * magic-tool auto palette on web — one knob, two effects.
 *
 * Stories:
 *   Default   — single row of 4, interactive selection
 *   TwoColumns — 2x2 grid (the desktop sidebar layout)
 */

// Cream backdrop so the white unselected pills read against it, matching
// the in-app coloring surface.
const CREAM = "#FDFAF5";

const meta: Meta<typeof PaletteVariantPills> = {
  title: "Coloring Experience/PaletteVariantPills",
  component: PaletteVariantPills,
  decorators: [
    (Story) => (
      <View style={styles.decorator}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PaletteVariantPills>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<PaletteVariant>("realistic");
    return (
      <View style={styles.wrap}>
        <PaletteVariantPills selected={selected} onSelect={setSelected} />
        <Text style={styles.caption}>
          Selected: {PALETTE_VARIANT_LABELS[selected]}
        </Text>
      </View>
    );
  },
};

export const TwoColumns: Story = {
  render: () => {
    const [selected, setSelected] = useState<PaletteVariant>("cute");
    return (
      <View style={[styles.wrap, styles.narrow]}>
        <PaletteVariantPills
          selected={selected}
          onSelect={setSelected}
          columns={2}
        />
        <Text style={styles.caption}>
          Selected: {PALETTE_VARIANT_LABELS[selected]}
        </Text>
      </View>
    );
  },
};

const styles = StyleSheet.create({
  decorator: {
    flex: 1,
    padding: 24,
    backgroundColor: CREAM,
    justifyContent: "center",
  },
  wrap: {
    gap: 16,
  },
  narrow: {
    maxWidth: 220,
    alignSelf: "center",
  },
  caption: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#433A33",
    textAlign: "center",
  },
});
