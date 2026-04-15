import type { Meta, StoryObj } from "@storybook/react-vite";
import ZoomControls from "./ZoomControls";

const meta: Meta<typeof ZoomControls> = {
  title: "Coloring/ZoomControls",
  component: ZoomControls,
};

export default meta;
type Story = StoryObj<typeof ZoomControls>;

export const Default: Story = {};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ZoomControls />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ZoomControls />
      </div>
    </div>
  ),
};
