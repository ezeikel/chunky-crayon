import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import DesktopColorPalette from "./DesktopColorPalette";

const meta: Meta<typeof DesktopColorPalette> = {
  title: "Coloring/DesktopColorPalette",
  component: DesktopColorPalette,
  decorators: [
    (Story) => (
      <ColoringContextProvider>
        <div style={{ width: 200 }}>
          <Story />
        </div>
      </ColoringContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DesktopColorPalette>;

export const Default: Story = {};
