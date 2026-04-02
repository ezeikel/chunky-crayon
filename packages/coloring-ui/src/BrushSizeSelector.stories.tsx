import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import BrushSizeSelector from "./BrushSizeSelector";

const meta: Meta<typeof BrushSizeSelector> = {
  title: "Coloring/BrushSizeSelector",
  component: BrushSizeSelector,
  decorators: [
    (Story) => (
      <ColoringContextProvider>
        <div style={{ maxWidth: 300 }}>
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrushSizeSelector>;

export const Default: Story = {};
