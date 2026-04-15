import type { Meta, StoryObj } from "@storybook/react-vite";
import ToolSelector from "./ToolSelector";

const meta: Meta<typeof ToolSelector> = {
  title: "Coloring/ToolSelector",
  component: ToolSelector,
};

export default meta;
type Story = StoryObj<typeof ToolSelector>;

export const Default: Story = {};

export const BothBrands: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-2">
          Chunky Crayon (kids)
        </div>
        <ToolSelector />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-2">
          Coloring Habitat (adult)
        </div>
        <ToolSelector />
      </div>
    </div>
  ),
};
