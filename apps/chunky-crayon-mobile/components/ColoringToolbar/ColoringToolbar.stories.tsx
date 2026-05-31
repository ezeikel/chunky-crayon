import { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColoringToolbar from "./ColoringToolbar";

/**
 * The middle-tier toolbar-above-canvas panel (web's ColoringToolbar) — used
 * at medium widths (iPad portrait / phone landscape). One flat white card
 * holding the palette-variant pills, a wide swatch grid, the tool row +
 * magic tiles, brush sizes, and an undo/redo + zoom row. Reads the canvas
 * store directly, so selecting tools / colors / brush sizes here drives the
 * same global state the real screen uses.
 */
const meta: Meta<typeof ColoringToolbar> = {
  title: "Coloring Experience/Coloring Toolbar (Middle)",
  component: ColoringToolbar,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          justifyContent: "flex-start",
          paddingVertical: 24,
          backgroundColor: "#FDFAF5",
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColoringToolbar>;

// Interactive default — wires the zoom handlers to a local zoom value so the
// ± / reset buttons enable/disable realistically.
export const Default: Story = {
  render: () => {
    const [zoom, setZoom] = useState(1);
    return (
      <ColoringToolbar
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(3, z * 1.2))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, z / 1.2))}
        onResetZoom={() => setZoom(1)}
      />
    );
  },
};

// Zoomed in — shows the zoom-out enabled, with zoom-in still available.
export const ZoomedIn: Story = {
  render: () => {
    const [zoom, setZoom] = useState(2);
    return (
      <ColoringToolbar
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(3, z * 1.2))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, z / 1.2))}
        onResetZoom={() => setZoom(1)}
      />
    );
  },
};
