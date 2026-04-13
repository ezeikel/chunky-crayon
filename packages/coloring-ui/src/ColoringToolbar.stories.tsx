import type { Meta, StoryObj } from "@storybook/react-vite";
import ColoringToolbar from "./ColoringToolbar";

const meta: Meta<typeof ColoringToolbar> = {
  title: "Coloring/ColoringToolbar",
  component: ColoringToolbar,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ColoringToolbar>;

export const Default: Story = {
  render: () => (
    <div className="p-8 bg-coloring-surface min-h-screen">
      <ColoringToolbar />
    </div>
  ),
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-4">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Chunky Crayon (kids)
        </div>
        <ColoringToolbar />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Coloring Habitat (adult)
        </div>
        <ColoringToolbar />
      </div>
    </div>
  ),
};
