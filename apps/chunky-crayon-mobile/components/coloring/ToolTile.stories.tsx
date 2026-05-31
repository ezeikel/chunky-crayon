import { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ToolTile from "./ToolTile";
import { COLORING_TOOLS } from "@/lib/coloring/tools";

/**
 * The coloring tool tile — the atom every coloring toolbar/sidebar is
 * built from. Mirrors CC web: regular tiles are orange-when-selected,
 * white-with-border otherwise; magic tiles carry the purple→pink
 * gradient + sparkle badge and a loading (region-store) state.
 */

const meta: Meta<typeof ToolTile> = {
  title: "Coloring Experience/ToolTile",
  component: ToolTile,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FDFAF5",
          padding: 24,
          alignItems: "flex-start",
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToolTile>;

const crayon = COLORING_TOOLS.find((t) => t.id === "crayon")!;
const magicBrush = COLORING_TOOLS.find((t) => t.id === "magic-reveal")!;

export const Unselected: Story = {
  args: {
    icon: crayon.icon,
    label: crayon.label,
    selected: false,
    size: 56,
    onPress: () => {},
  },
};

export const Selected: Story = {
  args: {
    icon: crayon.icon,
    label: crayon.label,
    selected: true,
    size: 56,
    onPress: () => {},
  },
};

export const Magic: Story = {
  args: {
    icon: magicBrush.icon,
    label: magicBrush.label,
    selected: false,
    isMagic: true,
    size: 56,
    onPress: () => {},
  },
};

export const MagicSelected: Story = {
  args: {
    icon: magicBrush.icon,
    label: magicBrush.label,
    selected: true,
    isMagic: true,
    size: 56,
    onPress: () => {},
  },
};

export const MagicLoading: Story = {
  args: {
    icon: magicBrush.icon,
    label: magicBrush.label,
    selected: false,
    isMagic: true,
    loading: true,
    size: 56,
    onPress: () => {},
  },
};

// The full tool row, interactive — tap to select, magic tiles included.
export const ToolRow: Story = {
  render: () => {
    const [sel, setSel] = useState("crayon");
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {COLORING_TOOLS.map((t) => (
          <ToolTile
            key={t.id}
            icon={t.icon}
            label={t.label}
            isMagic={t.isMagic}
            selected={sel === t.id}
            size={56}
            onPress={() => setSel(t.id)}
          />
        ))}
      </View>
    );
  },
};
