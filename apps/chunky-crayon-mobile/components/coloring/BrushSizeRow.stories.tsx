import { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import BrushSizeRow from "./BrushSizeRow";
import { COLORING_BRUSH_SIZES } from "@/lib/coloring/palette";

/**
 * The 3-tile brush-size picker (Fine / Regular / Chunky). Tap a tile to
 * select it: the selected tile goes solid orange with a white dot, the
 * rest stay white with the dot rendered in the current paint color.
 * Dot diameter scales with the brush radius (8 / 18 / 24), matching web.
 */

const meta: Meta<typeof BrushSizeRow> = {
  title: "Coloring Experience/BrushSizeRow",
  component: BrushSizeRow,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 16,
          backgroundColor: "#FDFAF5",
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrushSizeRow>;

// Interactive default — black (default) dot color on the unselected tiles.
export const Default: Story = {
  render: () => {
    const [selectedRadius, setSelectedRadius] = useState<number>(
      COLORING_BRUSH_SIZES[1].radius,
    );
    return (
      <BrushSizeRow
        selectedRadius={selectedRadius}
        onSelect={setSelectedRadius}
      />
    );
  },
};

// A non-black paint color so the unselected dot color reads clearly.
export const WithPaintColor: Story = {
  render: () => {
    const [selectedRadius, setSelectedRadius] = useState<number>(
      COLORING_BRUSH_SIZES[0].radius,
    );
    return (
      <BrushSizeRow
        selectedRadius={selectedRadius}
        onSelect={setSelectedRadius}
        color="#1E88E5"
      />
    );
  },
};
