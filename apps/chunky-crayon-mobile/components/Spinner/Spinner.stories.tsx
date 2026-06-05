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

// No color → the brand DUOTONE (orange primary + teal secondary @ 0.6),
// matching web's Loading.tsx.
export const Default: Story = {};

export const Large: Story = {
  args: { size: 96 },
};

// Explicit color → MONOTONE in that color (so white spinners on coloured
// buttons stay visible — a hardcoded orange/teal would vanish on an orange CTA).
export const TintedOrange: Story = {
  args: { color: "#E46444" },
};

export const White: Story = {
  args: { color: "#FFFFFF" },
};
