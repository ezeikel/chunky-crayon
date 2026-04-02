import type { Meta, StoryObj } from "@storybook/react-vite";
import AutoColorButton from "./AutoColorButton";

const meta: Meta<typeof AutoColorButton> = {
  title: "Coloring/AutoColorButton",
  component: AutoColorButton,
  args: {
    onClick: () => alert("Auto color clicked!"),
    isLoading: false,
    isComplete: false,
    isError: false,
  },
};

export default meta;
type Story = StoryObj<typeof AutoColorButton>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const Complete: Story = {
  args: { isComplete: true },
};

export const Error: Story = {
  args: { isError: true },
};
