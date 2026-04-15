import type { Meta, StoryObj } from "@storybook/react-vite";
import ProgressIndicator from "./ProgressIndicator";

const meta: Meta<typeof ProgressIndicator> = {
  title: "Coloring/ProgressIndicator",
  component: ProgressIndicator,
};

export default meta;
type Story = StoryObj<typeof ProgressIndicator>;

export const Default: Story = {};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ProgressIndicator />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ProgressIndicator />
      </div>
    </div>
  ),
};
