import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import ColorPalette from "./ColorPalette";

const meta: Meta<typeof ColorPalette> = {
  title: "Coloring/ColorPalette",
  component: ColorPalette,
  decorators: [
    (Story) => (
      <ColoringContextProvider>
        <div style={{ maxWidth: 400 }}>
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColorPalette>;

export const Default: Story = {};
