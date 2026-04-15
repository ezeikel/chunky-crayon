import type { Meta, StoryObj } from "@storybook/react-vite";
import MobileColoringDrawer from "./MobileColoringDrawer";

const meta: Meta<typeof MobileColoringDrawer> = {
  title: "Coloring/MobileColoringDrawer",
  component: MobileColoringDrawer,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
};

export default meta;
type Story = StoryObj<typeof MobileColoringDrawer>;

export const Default: Story = {
  render: () => (
    <div className="relative min-h-screen bg-coloring-surface">
      <div className="p-4 text-coloring-muted text-sm">
        Mobile drawer for tools and colors.
      </div>
      <MobileColoringDrawer />
    </div>
  ),
};
