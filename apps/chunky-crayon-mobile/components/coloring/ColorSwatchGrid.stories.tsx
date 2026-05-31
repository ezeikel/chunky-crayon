import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColorSwatchGrid from "./ColorSwatchGrid";
import {
  COLORING_PALETTE_VARIANTS,
  PALETTE_VARIANTS,
  PALETTE_VARIANT_LABELS,
  type PaletteVariant,
} from "@/lib/coloring/palette";

/**
 * The coloring color picker — the 18-swatch grid for a palette variant,
 * matching CC web. Tap a swatch to select it (orange ring + white inner
 * border). Stories show the responsive column counts (phone 8, sidebar 3)
 * and let you flip between the four mood variants.
 */

const ACCENT = "#E46444";
const TEXT_PRIMARY = "#433A33";

const meta: Meta<typeof ColorSwatchGrid> = {
  title: "Coloring Experience/ColorSwatchGrid",
  component: ColorSwatchGrid,
  decorators: [
    (Story) => (
      <View style={styles.decorator}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: PALETTE_VARIANTS,
    },
    columns: { control: { type: "number" } },
  },
};

export default meta;
type Story = StoryObj<typeof ColorSwatchGrid>;

// Interactive wrapper: keeps the selected swatch in local state so taps
// move the ring, like the live coloring screen.
const InteractiveGrid = ({
  variant,
  columns,
}: {
  variant: PaletteVariant;
  columns: number;
}) => {
  const [selectedColor, setSelectedColor] = useState(
    COLORING_PALETTE_VARIANTS[variant][0].hex,
  );

  // Reset selection when the variant changes so the ring stays valid.
  const swatches = COLORING_PALETTE_VARIANTS[variant];
  const hasSelection = swatches.some((s) => s.hex === selectedColor);
  const effective = hasSelection ? selectedColor : swatches[0].hex;
  const selectedName =
    swatches.find((s) => s.hex === effective)?.name ?? "None";

  return (
    <View style={styles.block}>
      <Text style={styles.caption}>
        {PALETTE_VARIANT_LABELS[variant]} · {columns} columns
      </Text>
      <ColorSwatchGrid
        variant={variant}
        selectedColor={effective}
        onSelect={setSelectedColor}
        columns={columns}
      />
      <Text style={styles.selected}>
        Selected: <Text style={styles.selectedName}>{selectedName}</Text>
      </Text>
    </View>
  );
};

export const Default: Story = {
  args: { variant: "realistic", columns: 8 },
  render: (args) => (
    <InteractiveGrid variant={args.variant} columns={args.columns ?? 8} />
  ),
};

export const ThreeColumnsSidebar: Story = {
  name: "3 columns (sidebar)",
  args: { variant: "realistic", columns: 3 },
  render: (args) => (
    <InteractiveGrid variant={args.variant} columns={args.columns ?? 3} />
  ),
};

export const TabletTenColumns: Story = {
  name: "10 columns (tablet)",
  args: { variant: "pastel", columns: 10 },
  render: (args) => (
    <InteractiveGrid variant={args.variant} columns={args.columns ?? 10} />
  ),
};

export const AllVariants: Story = {
  name: "All four variants",
  render: () => (
    <View style={styles.stack}>
      {PALETTE_VARIANTS.map((variant) => (
        <InteractiveGrid key={variant} variant={variant} columns={8} />
      ))}
    </View>
  ),
};

const styles = StyleSheet.create({
  decorator: {
    flex: 1,
    padding: 24,
    backgroundColor: "#FDFAF5",
  },
  stack: {
    gap: 28,
  },
  block: {
    gap: 12,
  },
  caption: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  selected: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  selectedName: {
    fontFamily: "TondoTrial-Bold",
    color: ACCENT,
  },
});
