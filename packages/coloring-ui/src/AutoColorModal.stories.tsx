import type { Meta, StoryObj } from "@storybook/react-vite";
import AutoColorModal from "./AutoColorModal";

const meta: Meta<typeof AutoColorModal> = {
  title: "Coloring/AutoColorModal",
  component: AutoColorModal,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof AutoColorModal>;

export const Default: Story = {
  render: () => (
    <div className="relative min-h-[400px] bg-coloring-surface">
      <AutoColorModal />
      <div className="p-8 text-coloring-muted text-sm">
        Modal triggers from context.isAutoColoring — renders only when true.
      </div>
    </div>
  ),
};
