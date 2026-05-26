import { View } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import ToolsSidebar from "./ToolsSidebar";

const meta: Meta<typeof ToolsSidebar> = {
  title: "Coloring Experience/ToolsSidebar",
  component: ToolsSidebar,
  argTypes: {
    width: { control: { type: "range", min: 120, max: 280, step: 8 } },
    zoom: { control: { type: "range", min: 1, max: 4, step: 0.5 } },
  },
  args: {
    width: 200,
    zoom: 1,
    minZoom: 1,
    maxZoom: 4,
    onZoomIn: action("zoom-in"),
    onZoomOut: action("zoom-out"),
    onResetZoom: action("reset-zoom"),
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, flexDirection: "row-reverse" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToolsSidebar>;

export const AtRest: Story = { args: { zoom: 1 } };
export const ZoomedIn: Story = { args: { zoom: 2.5 } };
export const MaxZoom: Story = { args: { zoom: 4 } };
