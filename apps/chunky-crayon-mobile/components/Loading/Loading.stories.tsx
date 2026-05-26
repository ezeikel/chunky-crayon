import type { Meta, StoryObj } from "@storybook/react-native";
import Loading from "./Loading";

const meta: Meta<typeof Loading> = {
  title: "Design System/Loading",
  component: Loading,
  argTypes: {
    spinnerColor: { control: "color" },
  },
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {};

export const TintedOrange: Story = {
  args: { spinnerColor: "#E46444" },
};
