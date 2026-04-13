import type { Meta, StoryObj } from "@storybook/react-vite";
import CompletionCelebration from "./CompletionCelebration";

const meta: Meta<typeof CompletionCelebration> = {
  title: "Coloring/CompletionCelebration",
  component: CompletionCelebration,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof CompletionCelebration>;

// Note: triggers via context.isColoringComplete — stories show the layout only.
// To see the full animation, wrap in a story that sets isColoringComplete.
export const Default: Story = {
  render: () => (
    <div className="relative min-h-[400px] bg-coloring-surface">
      <CompletionCelebration />
      <div className="p-8 text-coloring-muted text-sm">
        Completion celebration renders when isColoringComplete becomes true in
        context.
      </div>
    </div>
  ),
};
