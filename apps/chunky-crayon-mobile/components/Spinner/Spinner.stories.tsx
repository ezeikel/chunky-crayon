import type { Meta, StoryObj } from "@storybook/react-native";
import Spinner from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Design System/Spinner",
  component: Spinner,
  argTypes: {
    size: { control: { type: "range", min: 16, max: 128, step: 8 } },
    color: { control: "color" },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Large: Story = {
  args: { size: 96 },
};

export const TintedOrange: Story = {
  args: { color: "#E46444" },
};
