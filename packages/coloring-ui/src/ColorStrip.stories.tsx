import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import ColorStrip from "./ColorStrip";

const meta: Meta<typeof ColorStrip> = {
  title: "Coloring/ColorStrip",
  component: ColorStrip,
  parameters: {
    docs: {
      description: {
        component:
          "Horizontal scrollable color strip for mobile. Disabled while " +
          "magic tools are active (AI picks colors automatically). Themed " +
          "via coloring-* tokens.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColorStrip>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <ColoringContextProvider storagePrefix="sb-strip-default">
        <div className="p-8 bg-coloring-surface min-h-screen max-w-md">
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
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
        <ColoringContextProvider variant="kids" storagePrefix="sb-cc-strip">
          <ColorStrip />
        </ColoringContextProvider>
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <div className="text-sm font-coloring-heading text-coloring-muted mb-4">
          Coloring Habitat (adult)
        </div>
        <ColoringContextProvider variant="adult" storagePrefix="sb-ch-strip">
          <ColorStrip />
        </ColoringContextProvider>
      </div>
    </div>
  ),
};
