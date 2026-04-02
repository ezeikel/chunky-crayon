import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColoringContextProvider } from "./context";
import UndoRedoButtons from "./UndoRedoButtons";

const meta: Meta<typeof UndoRedoButtons> = {
  title: "Coloring/UndoRedoButtons",
  component: UndoRedoButtons,
  decorators: [
    (Story) => (
      <ColoringContextProvider>
        <Story />
      </ColoringContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UndoRedoButtons>;

export const Default: Story = {};
