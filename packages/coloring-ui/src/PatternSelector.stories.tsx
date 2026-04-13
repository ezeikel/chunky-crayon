import type { Meta, StoryObj } from "@storybook/react-vite";
import PatternSelector from "./PatternSelector";

const meta: Meta<typeof PatternSelector> = {
  title: "Coloring/PatternSelector",
  component: PatternSelector,
};

export default meta;
type Story = StoryObj<typeof PatternSelector>;

export const Default: Story = {};

export const BothBrands: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <PatternSelector />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <PatternSelector />
      </div>
    </div>
  ),
};
