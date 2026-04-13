import type { Meta, StoryObj } from "@storybook/react-vite";
import AutoColorPreview from "./AutoColorPreview";

const placeholderImage =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
      <rect width='100%' height='100%' fill='#ffd180'/>
      <circle cx='120' cy='150' r='60' fill='#ff6f00'/>
      <circle cx='280' cy='150' r='80' fill='#2e7d32'/>
    </svg>`,
  );

const meta: Meta<typeof AutoColorPreview> = {
  title: "Coloring/AutoColorPreview",
  component: AutoColorPreview,
  args: {
    referenceImage: placeholderImage,
    onApply: () => {},
    onRetry: () => {},
    onCancel: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AutoColorPreview>;

export const Default: Story = {};

export const Retrying: Story = {
  args: { isRetrying: true },
};
