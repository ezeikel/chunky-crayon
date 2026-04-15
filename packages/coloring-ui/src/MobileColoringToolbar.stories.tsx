import type { Meta, StoryObj } from "@storybook/react-vite";
import MobileColoringToolbar from "./MobileColoringToolbar";

const meta: Meta<typeof MobileColoringToolbar> = {
  title: "Coloring/MobileColoringToolbar",
  component: MobileColoringToolbar,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
};

export default meta;
type Story = StoryObj<typeof MobileColoringToolbar>;

export const Default: Story = {
  render: () => (
    <div className="relative min-h-screen bg-coloring-surface">
      <div className="p-4 text-coloring-muted text-sm">
        Draggable bottom sheet toolbar for mobile.
      </div>
      <MobileColoringToolbar />
    </div>
  ),
};
