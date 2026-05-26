import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import BrushSizeSelector from "./BrushSizeSelector";

const meta: Meta<typeof BrushSizeSelector> = {
  title: "Design System/BrushSizeSelector",
  component: BrushSizeSelector,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrushSizeSelector>;

export const Default: Story = {};
