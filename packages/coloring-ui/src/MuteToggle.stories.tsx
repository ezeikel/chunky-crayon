import type { Meta, StoryObj } from "@storybook/react-vite";
import MuteToggle from "./MuteToggle";

const meta: Meta<typeof MuteToggle> = {
  title: "Coloring/MuteToggle",
  component: MuteToggle,
  parameters: {
    docs: {
      description: {
        component:
          "Two side-by-side icon tiles for SFX and ambient music. " +
          "SFX defaults on; music defaults off.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MuteToggle>;

export const Default: Story = {};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <MuteToggle />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface flex justify-center"
      >
        <MuteToggle />
      </div>
    </div>
  ),
};
