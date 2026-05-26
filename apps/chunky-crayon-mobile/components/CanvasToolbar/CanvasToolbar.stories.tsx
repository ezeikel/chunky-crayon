import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import CanvasToolbar from "./CanvasToolbar";

const meta: Meta<typeof CanvasToolbar> = {
  title: "Coloring Experience/CanvasToolbar",
  component: CanvasToolbar,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CanvasToolbar>;

export const Default: Story = {};
