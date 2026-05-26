import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import SideToolbar from "./SideToolbar";

const meta: Meta<typeof SideToolbar> = {
  title: "Coloring Experience/SideToolbar",
  component: SideToolbar,
  argTypes: {
    collapsible: { control: "boolean" },
    buttonSize: { control: { type: "range", min: 32, max: 72, step: 4 } },
  },
  args: { collapsible: true, buttonSize: 48 },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SideToolbar>;

export const Expanded: Story = { args: { collapsible: true } };
export const FixedNonCollapsible: Story = { args: { collapsible: false } };
export const LargeButtons: Story = {
  args: { collapsible: false, buttonSize: 64 },
};
